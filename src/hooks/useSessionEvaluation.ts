import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Scores } from "@/types/session";

interface EvaluationResult {
  transcript: string;
  scores: Scores;
  feedbackText: string;
}

export function useSessionEvaluation() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    const { data, error } = await supabase.functions.invoke("transcribe", {
      body: formData,
    });

    if (error) throw new Error(`Transcription failed: ${error.message}`);
    if (!data?.transcript) throw new Error("No transcript returned");
    return data.transcript;
  }, []);

  const evaluateAnswer = useCallback(
    async (
      question: string,
      transcript: string,
      track: string,
      difficulty: string,
      expectedAnswer?: string
    ): Promise<{ scores: Scores; feedbackText: string }> => {
      const { data, error } = await supabase.functions.invoke("evaluate", {
        body: { question, transcript, track, difficulty, expectedAnswer },
      });

      if (error) throw new Error(`Evaluation failed: ${error.message}`);
      return {
        scores: data.scores,
        feedbackText: data.feedbackText,
      };
    },
    []
  );

  const speakFeedback = useCallback(async (text: string) => {
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

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
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

  const processAnswer = useCallback(
    async (
      audioBlob: Blob,
      question: string,
      track: string,
      difficulty: string
    ): Promise<EvaluationResult> => {
      setIsProcessing(true);
      try {
        const transcript = await transcribeAudio(audioBlob);
        const { scores, feedbackText } = await evaluateAnswer(
          question,
          transcript,
          track,
          difficulty
        );
        return { transcript, scores, feedbackText };
      } finally {
        setIsProcessing(false);
      }
    },
    [transcribeAudio, evaluateAnswer]
  );

  return {
    processAnswer,
    speakFeedback,
    stopSpeaking,
    isProcessing,
    isSpeaking,
  };
}
