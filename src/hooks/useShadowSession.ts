import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  ShadowRole,
  DialogueLine,
  SegmentResult,
  PronunciationScores,
  WordIssue,
} from "@/types/shadow";
import { toast } from "sonner";

type Status = "idle" | "extracting" | "splitting" | "role-select" | "playing" | "evaluating" | "results";

export function useShadowSession() {
  const [status, setStatus] = useState<Status>("idle");
  const [videoTitle, setVideoTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [roles, setRoles] = useState<ShadowRole[]>([]);
  const [dialogue, setDialogue] = useState<DialogueLine[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [userSegments, setUserSegments] = useState<DialogueLine[]>([]);
  const [otherSegments, setOtherSegments] = useState<DialogueLine[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [results, setResults] = useState<SegmentResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const extractTranscript = useCallback(async (youtubeUrl: string) => {
    setStatus("extracting");
    try {
      const { data, error } = await supabase.functions.invoke("extract-youtube-transcript", {
        body: { youtubeUrl },
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setVideoTitle(data.videoTitle);
      setTranscript(data.transcript);
      setStatus("splitting");

      // Now split dialogue
      const { data: splitData, error: splitError } = await supabase.functions.invoke("split-dialogue", {
        body: { transcript: data.transcript, videoTitle: data.videoTitle },
      });
      if (splitError) throw new Error(splitError.message);
      if (splitData.error) throw new Error(splitData.error);

      setRoles(splitData.roles);
      setDialogue(splitData.dialogue);
      setStatus("role-select");
    } catch (err) {
      console.error("Extract error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to extract transcript");
      setStatus("idle");
    }
  }, []);

  const selectRole = useCallback(
    (roleName: string) => {
      setSelectedRole(roleName);
      const userLines = dialogue.filter((d) => d.role === roleName);
      const otherLines = dialogue.filter((d) => d.role !== roleName);
      setUserSegments(userLines);
      setOtherSegments(otherLines);
      setResults(
        userLines.map((l, i) => ({
          segmentIndex: i,
          expectedText: l.text,
          userTranscript: null,
          scores: null,
          overallScore: null,
          feedback: null,
          wordIssues: [],
        }))
      );
      setCurrentSegmentIndex(0);
      setStatus("playing");
    },
    [dialogue]
  );

  const evaluateSegment = useCallback(
    async (audioBlob: Blob, segmentIdx: number) => {
      setIsProcessing(true);
      try {
        // Transcribe user audio
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        const { data: txData, error: txError } = await supabase.functions.invoke("transcribe", {
          body: formData,
        });
        if (txError) throw new Error(txError.message);
        const userTranscript = txData.transcript;

        // Evaluate pronunciation
        const expectedText = userSegments[segmentIdx].text;
        const { data: evalData, error: evalError } = await supabase.functions.invoke(
          "evaluate-pronunciation",
          {
            body: {
              expectedText,
              userTranscript,
              segmentIndex: segmentIdx,
              totalSegments: userSegments.length,
            },
          }
        );
        if (evalError) throw new Error(evalError.message);

        setResults((prev) =>
          prev.map((r, i) =>
            i === segmentIdx
              ? {
                  ...r,
                  userTranscript,
                  scores: evalData.scores,
                  overallScore: evalData.overallScore,
                  feedback: evalData.feedback,
                  wordIssues: evalData.wordIssues || [],
                }
              : r
          )
        );

        return { userTranscript, scores: evalData.scores, feedback: evalData.feedback };
      } catch (err) {
        console.error("Evaluate segment error:", err);
        toast.error("Evaluation failed. Try again.");
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [userSegments]
  );

  const nextSegment = useCallback(() => {
    if (currentSegmentIndex < userSegments.length - 1) {
      setCurrentSegmentIndex((i) => i + 1);
    } else {
      setStatus("results");
    }
  }, [currentSegmentIndex, userSegments.length]);

  const reset = useCallback(() => {
    setStatus("idle");
    setVideoTitle("");
    setTranscript("");
    setRoles([]);
    setDialogue([]);
    setSelectedRole(null);
    setUserSegments([]);
    setOtherSegments([]);
    setCurrentSegmentIndex(0);
    setResults([]);
  }, []);

  // Get the dialogue flow for the current segment (what comes before user's turn)
  const getCurrentContext = useCallback(() => {
    if (userSegments.length === 0) return [];
    const userLine = userSegments[currentSegmentIndex];
    // Find this line in the full dialogue and get the preceding other-role line
    const dialogueIdx = dialogue.findIndex(
      (d) => d.index === userLine.index
    );
    const context: DialogueLine[] = [];
    if (dialogueIdx > 0) {
      context.push(dialogue[dialogueIdx - 1]);
    }
    return context;
  }, [dialogue, userSegments, currentSegmentIndex]);

  return {
    status,
    videoTitle,
    roles,
    dialogue,
    selectedRole,
    userSegments,
    currentSegmentIndex,
    results,
    isProcessing,
    extractTranscript,
    selectRole,
    evaluateSegment,
    nextSegment,
    reset,
    getCurrentContext,
  };
}
