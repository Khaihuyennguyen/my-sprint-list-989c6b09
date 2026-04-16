import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ShadowRole, DialogueLine } from "@/types/shadow";
import { toast } from "sonner";

type Status = "idle" | "splitting" | "role-select" | "playing" | "evaluating" | "results";

export interface ShadowSegmentResult {
  line: DialogueLine;
  audioBlob: Blob;
  azureScores?: any;
  recognizedText?: string;
  problemWords?: any[];
}

export interface ShadowFinalReview {
  overallSummary: string;
  strengths: string[];
  weaknesses: string[];
  studyPlan: {
    wordDrills: Array<{ word: string; phoneticTip: string; exampleSentence: string }>;
    sentenceDrills: Array<{ sentence: string; focus: string }>;
    dailyRoutine: string;
  };
  topProblemWords?: Array<{ word: string; accuracy: number; occurrences: number }>;
}

export function useShadowSession() {
  const [status, setStatus] = useState<Status>("idle");
  const [videoTitle, setVideoTitle] = useState("");
  const [roles, setRoles] = useState<ShadowRole[]>([]);
  const [dialogue, setDialogue] = useState<DialogueLine[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [segmentResults, setSegmentResults] = useState<ShadowSegmentResult[]>([]);
  const [finalReview, setFinalReview] = useState<ShadowFinalReview | null>(null);

  const processTranscript = useCallback(async (data: { videoTitle: string; transcript: string }) => {
    setStatus("splitting");
    setVideoTitle(data.videoTitle);
    try {
      const cleanedTranscript = data.transcript
        .replace(/^\d{1,2}:\d{2}(:\d{2})?\s*/gm, "")
        .replace(/\n+/g, " ")
        .trim();

      const { data: splitData, error: splitError } = await supabase.functions.invoke("split-dialogue", {
        body: { transcript: cleanedTranscript, videoTitle: data.videoTitle },
      });
      if (splitError) throw new Error(splitError.message);
      if (splitData.error) throw new Error(splitData.error);

      setRoles(splitData.roles);
      setDialogue(splitData.dialogue);
      setStatus("role-select");
    } catch (err) {
      console.error("Split error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to split dialogue");
      setStatus("idle");
    }
  }, []);

  const selectRole = useCallback((roleName: string) => {
    setSelectedRole(roleName);
    setSegmentResults([]);
    setFinalReview(null);
    setStatus("playing");
  }, []);

  const finishSession = useCallback(
    async (results: ShadowSegmentResult[]) => {
      setSegmentResults(results);
      setStatus("evaluating");

      try {
        const conversation = results.map((r) => ({
          expectedText: r.line.text,
          recognizedText: r.recognizedText || "",
          azureScores: r.azureScores,
          problemWords: r.problemWords || [],
          attempts: 1,
        }));

        const { data, error } = await supabase.functions.invoke("teacher-final-eval", {
          body: { conversation },
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);

        setFinalReview(data as ShadowFinalReview);
      } catch (err) {
        console.error("Finalize error:", err);
        toast.error("Couldn't generate study plan. Showing basic results.");
      } finally {
        setStatus("results");
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setVideoTitle("");
    setRoles([]);
    setDialogue([]);
    setSelectedRole(null);
    setSegmentResults([]);
    setFinalReview(null);
  }, []);

  return {
    status,
    videoTitle,
    roles,
    dialogue,
    selectedRole,
    segmentResults,
    finalReview,
    processTranscript,
    selectRole,
    finishSession,
    reset,
  };
}
