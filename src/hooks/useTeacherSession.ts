import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TeacherSegment {
  expectedText: string;
  role: string;
  index: number;
}

export interface TeacherAttempt {
  attemptNumber: number;
  recognizedText: string;
  azureScores: {
    accuracyScore: number;
    fluencyScore: number;
    completenessScore: number;
    pronScore: number;
    prosodyScore: number;
  };
  problemWords: Array<{ word: string; accuracyScore: number; errorType: string }>;
  feedback: string;
  shouldRetry: boolean;
  encouragement: string;
  focusWords: string[];
  passed: boolean;
}

export interface TeacherResult {
  segment: TeacherSegment;
  attempts: TeacherAttempt[];
  bestScore: number;
}

type TeacherStatus = "idle" | "listening" | "recording" | "evaluating" | "feedback" | "complete";

export function useTeacherSession() {
  const [segments, setSegments] = useState<TeacherSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [status, setStatus] = useState<TeacherStatus>("idle");
  const [results, setResults] = useState<TeacherResult[]>([]);
  const [currentAttempts, setCurrentAttempts] = useState<TeacherAttempt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startSession = useCallback((segs: TeacherSegment[]) => {
    setSegments(segs);
    setCurrentSegmentIndex(0);
    setResults([]);
    setCurrentAttempts([]);
    setStatus("listening");
  }, []);

  const speakText = useCallback(async (text: string): Promise<void> => {
    try {
      setIsSpeaking(true);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) throw new Error("TTS failed");

      const audioBuffer = await response.arrayBuffer();
      const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      return new Promise((resolve) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.play();
      });
    } catch (err) {
      console.error("TTS error:", err);
      setIsSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const evaluateAttempt = useCallback(
    async (audioBlob: Blob): Promise<TeacherAttempt | null> => {
      const segment = segments[currentSegmentIndex];
      if (!segment) return null;

      setIsProcessing(true);
      setStatus("evaluating");

      try {
        // Step 1: Send audio to Azure for pronunciation assessment
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        formData.append("referenceText", segment.expectedText);

        const { data: azureData, error: azureError } = await supabase.functions.invoke(
          "azure-pronunciation",
          { body: formData }
        );

        if (azureError) throw new Error(azureError.message);
        if (azureData.error) throw new Error(azureData.error);

        // Step 2: Get teacher feedback using AI + Azure scores
        const attemptNumber = currentAttempts.length + 1;
        const previousFeedback = currentAttempts.length > 0
          ? currentAttempts[currentAttempts.length - 1].feedback
          : null;

        const { data: teacherData, error: teacherError } = await supabase.functions.invoke(
          "teacher-eval",
          {
            body: {
              expectedText: segment.expectedText,
              recognizedText: azureData.recognizedText,
              azureScores: azureData.scores,
              problemWords: azureData.problemWords,
              attemptNumber,
              previousFeedback,
            },
          }
        );

        if (teacherError) throw new Error(teacherError.message);
        if (teacherData.error) throw new Error(teacherData.error);

        const attempt: TeacherAttempt = {
          attemptNumber,
          recognizedText: azureData.recognizedText,
          azureScores: azureData.scores,
          problemWords: azureData.problemWords || [],
          feedback: teacherData.feedback,
          shouldRetry: teacherData.shouldRetry,
          encouragement: teacherData.encouragement,
          focusWords: teacherData.focusWords || [],
          passed: teacherData.passed,
        };

        setCurrentAttempts((prev) => [...prev, attempt]);
        setStatus("feedback");

        // Speak the feedback
        await speakText(attempt.feedback);

        return attempt;
      } catch (err) {
        console.error("Teacher evaluate error:", err);
        toast.error("Evaluation failed. Try again.");
        setStatus("listening");
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [segments, currentSegmentIndex, currentAttempts, speakText]
  );

  const retrySegment = useCallback(() => {
    stopSpeaking();
    setStatus("listening");
  }, [stopSpeaking]);

  const nextSegment = useCallback(() => {
    stopSpeaking();
    const segment = segments[currentSegmentIndex];

    // Save result for current segment
    const bestScore = Math.max(...currentAttempts.map((a) => a.azureScores.pronScore), 0);
    setResults((prev) => [
      ...prev,
      { segment, attempts: currentAttempts, bestScore },
    ]);

    if (currentSegmentIndex < segments.length - 1) {
      setCurrentSegmentIndex((i) => i + 1);
      setCurrentAttempts([]);
      setStatus("listening");
    } else {
      setStatus("complete");
    }
  }, [segments, currentSegmentIndex, currentAttempts, stopSpeaking]);

  const reset = useCallback(() => {
    stopSpeaking();
    setSegments([]);
    setCurrentSegmentIndex(0);
    setResults([]);
    setCurrentAttempts([]);
    setStatus("idle");
  }, [stopSpeaking]);

  return {
    segments,
    currentSegmentIndex,
    status,
    results,
    currentAttempts,
    isProcessing,
    isSpeaking,
    startSession,
    evaluateAttempt,
    retrySegment,
    nextSegment,
    speakText,
    stopSpeaking,
    reset,
  };
}
