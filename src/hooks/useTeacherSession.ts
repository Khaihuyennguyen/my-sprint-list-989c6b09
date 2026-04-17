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

export interface FinalReview {
  overallSummary: string;
  strengths: string[];
  weaknesses: string[];
  studyPlan: {
    wordDrills: Array<{ word: string; phoneticTip: string; exampleSentence: string }>;
    sentenceDrills: Array<{ sentence: string; focus: string }>;
    dailyRoutine: string;
  };
  topProblemWords: Array<{ word: string; accuracy: number; occurrences: number }>;
}

type TeacherStatus =
  | "idle"
  | "intro"        // teacher reads sentence + countdown
  | "countdown"    // 3-2-1
  | "listening"    // ready, awaiting user record
  | "recording"
  | "evaluating"
  | "feedback"
  | "finalizing"   // generating final review
  | "complete";

export function useTeacherSession() {
  const [segments, setSegments] = useState<TeacherSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [status, setStatus] = useState<TeacherStatus>("idle");
  const [results, setResults] = useState<TeacherResult[]>([]);
  const [currentAttempts, setCurrentAttempts] = useState<TeacherAttempt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [finalReview, setFinalReview] = useState<FinalReview | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

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

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }, []);

  // Runs a smooth 3-2-1 countdown, resolves when finished
  const runCountdown = useCallback((from = 3): Promise<void> => {
    return new Promise((resolve) => {
      let current = from;
      setCountdown(current);
      const tick = () => {
        current -= 1;
        if (current <= 0) {
          setCountdown(null);
          countdownTimerRef.current = null;
          resolve();
          return;
        }
        setCountdown(current);
        countdownTimerRef.current = window.setTimeout(tick, 750);
      };
      countdownTimerRef.current = window.setTimeout(tick, 750);
    });
  }, []);

  // Intro a segment: speak it, then countdown, then call onReady (which starts recording)
  const introSegment = useCallback(
    async (idx: number, onReady: () => void) => {
      const seg = segments[idx];
      if (!seg) return;
      setStatus("intro");
      // Brief teacher prompt + the sentence
      const intro =
        idx === 0
          ? `Hello! Let's practice. Repeat after me: ${seg.expectedText}`
          : `Now try this one: ${seg.expectedText}`;
      await speakText(intro);
      setStatus("countdown");
      await runCountdown(3);
      setStatus("listening");
      onReady();
    },
    [segments, speakText, runCountdown]
  );

  const startSession = useCallback(
    (segs: TeacherSegment[]) => {
      setSegments(segs);
      setCurrentSegmentIndex(0);
      setResults([]);
      setCurrentAttempts([]);
      setFinalReview(null);
      setStatus("listening");
    },
    []
  );

  const evaluateAttempt = useCallback(
    async (audioBlob: Blob): Promise<TeacherAttempt | null> => {
      const segment = segments[currentSegmentIndex];
      if (!segment) return null;

      setIsProcessing(true);
      setStatus("evaluating");

      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        formData.append("referenceText", segment.expectedText);

        const { data: azureData, error: azureError } = await supabase.functions.invoke(
          "azure-pronunciation",
          { body: formData }
        );

        if (azureError) throw new Error(azureError.message);
        if (azureData.error) throw new Error(azureData.error);

        const attemptNumber = currentAttempts.length + 1;
        const previousFeedback =
          currentAttempts.length > 0
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
    clearCountdown();
    setStatus("listening");
  }, [stopSpeaking, clearCountdown]);

  const finalizeSession = useCallback(
    async (allResults: TeacherResult[]) => {
      setStatus("finalizing");
      try {
        const conversation = allResults.map((r) => {
          const best = r.attempts.reduce(
            (b, a) => (a.azureScores.pronScore > (b?.azureScores.pronScore ?? -1) ? a : b),
            r.attempts[0]
          );
          return {
            expectedText: r.segment.expectedText,
            recognizedText: best?.recognizedText ?? "",
            azureScores: best?.azureScores,
            problemWords: best?.problemWords ?? [],
            attempts: r.attempts.length,
          };
        });

        const { data, error } = await supabase.functions.invoke("teacher-final-eval", {
          body: { conversation },
        });
        if (error) throw new Error(error.message);
        if (data.error) throw new Error(data.error);
        setFinalReview(data as FinalReview);
      } catch (err) {
        console.error("Finalize error:", err);
        toast.error("Couldn't generate final review. Showing basic summary.");
      } finally {
        setStatus("complete");
      }
    },
    []
  );

  const nextSegment = useCallback(() => {
    stopSpeaking();
    const segment = segments[currentSegmentIndex];

    const bestScore = Math.max(...currentAttempts.map((a) => a.azureScores.pronScore), 0);
    const updatedResults = [
      ...results,
      { segment, attempts: currentAttempts, bestScore },
    ];
    setResults(updatedResults);

    if (currentSegmentIndex < segments.length - 1) {
      setCurrentSegmentIndex((i) => i + 1);
      setCurrentAttempts([]);
      setStatus("listening");
    } else {
      // Session complete — run final analysis
      finalizeSession(updatedResults);
    }
  }, [segments, currentSegmentIndex, currentAttempts, results, stopSpeaking, finalizeSession]);

  const reset = useCallback(() => {
    stopSpeaking();
    clearCountdown();
    setSegments([]);
    setCurrentSegmentIndex(0);
    setResults([]);
    setCurrentAttempts([]);
    setFinalReview(null);
    setStatus("idle");
  }, [stopSpeaking, clearCountdown]);

  return {
    segments,
    currentSegmentIndex,
    status,
    results,
    currentAttempts,
    isProcessing,
    isSpeaking,
    countdown,
    finalReview,
    startSession,
    evaluateAttempt,
    retrySegment,
    nextSegment,
    speakText,
    stopSpeaking,
    introSegment,
    reset,
  };
}
