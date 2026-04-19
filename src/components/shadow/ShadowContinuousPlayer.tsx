import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Mic, Loader2, MessageSquareQuote, Sparkles, Pause } from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";
import { Waveform } from "@/components/Waveform";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DialogueLine } from "@/types/shadow";

interface Props {
  dialogue: DialogueLine[];           // full dialogue in order
  selectedRole: string;
  onComplete: (segmentResults: Array<{
    line: DialogueLine;
    audioBlob: Blob;
    azureScores?: any;
    recognizedText?: string;
    problemWords?: any[];
  }>) => void;
}

type Phase =
  | "intro"      // explaining the flow
  | "countdown"  // 3-2-1 before start
  | "playing"    // TTS playing other-speaker line
  | "userTurn"   // recording user's line
  | "transition" // brief pause between lines
  | "evaluating"; // sending all to backend

export function ShadowContinuousPlayer({ dialogue, selectedRole, onComplete }: Props) {
  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording, duration, error, isSilent, mimeType } = useAudioRecorder({
    silenceTimeoutMs: 12000,
    onSilenceStop: () => toast.info("Auto-stopped after silence"),
  });
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentIdx, setCurrentIdx] = useState(0); // index into dialogue
  const [countdown, setCountdown] = useState(3);
  const [recordings, setRecordings] = useState<Map<number, { blob: Blob; mime: string }>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waitingForBlob = useRef<{ idx: number } | null>(null);

  const currentLine = dialogue[currentIdx];
  const isUserLine = currentLine?.role === selectedRole;
  const userLines = dialogue.filter((d) => d.role === selectedRole);
  const userLinesDone = Array.from(recordings.keys()).filter((idx) =>
    dialogue[idx]?.role === selectedRole
  ).length;

  // === TTS helper ===
  const playTTS = useCallback(async (text: string): Promise<void> => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}`, apikey: anonKey },
          body: JSON.stringify({ text }),
        }
      );
      if (!response.ok) throw new Error("TTS failed");
      const buf = await response.arrayBuffer();
      const blob = new Blob([buf], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      return new Promise((resolve) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play();
      });
    } catch (err) {
      console.error("TTS error:", err);
    }
  }, []);

  // === Start the dialogue flow ===
  const startFlow = useCallback(async () => {
    setPhase("countdown");
    for (let n = 3; n > 0; n--) {
      setCountdown(n);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCurrentIdx(0);
    advanceTo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === Advance to a dialogue index ===
  const advanceTo = useCallback(
    async (idx: number) => {
      if (idx >= dialogue.length) {
        // All lines done — evaluate
        setPhase("evaluating");
        await evaluateAll();
        return;
      }
      const line = dialogue[idx];
      if (line.role === selectedRole) {
        // User's turn — show prompt; user must tap to start (browser gesture requirement)
        setPhase("userTurn");
      } else {
        // Other speaker — play TTS
        setPhase("playing");
        await playTTS(line.text);
        // Brief pause then go to next
        await new Promise((r) => setTimeout(r, 300));
        setCurrentIdx(idx + 1);
        advanceTo(idx + 1);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dialogue, selectedRole, playTTS]
  );

  const handleStartUserRecording = useCallback(async () => {
    resetRecording();
    await startRecording();
  }, [resetRecording, startRecording]);

  // When user stops recording, save blob and advance
  const handleStopRecording = useCallback(() => {
    waitingForBlob.current = { idx: currentIdx };
    stopRecording();
  }, [stopRecording, currentIdx]);

  useEffect(() => {
    if (audioBlob && waitingForBlob.current) {
      const idx = waitingForBlob.current.idx;
      waitingForBlob.current = null;
      if (isSilent) {
        toast.error("We didn't hear you. Tap the mic and try again.");
        resetRecording();
        // Stay on the same line for retry
        return;
      }
      const mime = mimeType ?? audioBlob.type ?? "audio/webm";
      setRecordings((prev) => {
        const next = new Map(prev);
        next.set(idx, { blob: audioBlob, mime });
        return next;
      });
      setPhase("transition");
      // Advance after small delay
      setTimeout(() => {
        const nextIdx = idx + 1;
        setCurrentIdx(nextIdx);
        advanceTo(nextIdx);
      }, 400);
    }
  }, [audioBlob, isSilent, mimeType, advanceTo, resetRecording]);

  // === Evaluate all recordings ===
  const evaluateAll = useCallback(async () => {
    try {
      const userIndices = dialogue
        .map((d, i) => ({ d, i }))
        .filter(({ d }) => d.role === selectedRole);

      const segmentResults = await Promise.all(
        userIndices.map(async ({ d, i }) => {
          const rec = recordings.get(i);
          if (!rec) return { line: d, audioBlob: new Blob() };

          const ext = rec.mime.includes("mp4") ? "mp4" : rec.mime.includes("ogg") ? "ogg" : "webm";
          const typedFile = new File([rec.blob], `recording.${ext}`, { type: rec.mime });
          const formData = new FormData();
          formData.append("audio", typedFile, `recording.${ext}`);
          formData.append("referenceText", d.text);

          try {
            const { data, error } = await supabase.functions.invoke("azure-pronunciation", {
              body: formData,
            });
            if (error) throw error;
            return {
              line: d,
              audioBlob: rec.blob,
              azureScores: data.scores,
              recognizedText: data.recognizedText,
              problemWords: data.problemWords || [],
            };
          } catch (err) {
            console.error("Azure eval failed for line", i, err);
            return { line: d, audioBlob: rec.blob };
          }
        })
      );

      onComplete(segmentResults);
    } catch (err) {
      console.error("Evaluate all error:", err);
      toast.error("Evaluation failed. Some scores may be missing.");
      onComplete([]);
    }
  }, [dialogue, selectedRole, recordings, onComplete]);

  // === RENDER ===

  if (phase === "intro") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 text-center"
      >
        <div className="glass-card p-6">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-display font-bold text-foreground mb-2">Continuous Roleplay</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            We'll play the other speaker's lines, then it's your turn — say your line and tap to stop.
            We do this for all <span className="text-primary font-semibold">{userLines.length} lines</span> straight through, then analyze everything at the end and build your study plan.
          </p>
          <div className="text-xs text-muted-foreground space-y-1 text-left max-w-sm mx-auto">
            <p>🎧 <span className="text-foreground">Listen</span> — AI reads other speaker</p>
            <p>🎙️ <span className="text-foreground">Speak</span> — Your turn auto-starts; tap stop when done</p>
            <p>📊 <span className="text-foreground">Review</span> — Full analysis + study plan at the end</p>
          </div>
        </div>
        <button
          onClick={startFlow}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          Start Roleplay
        </button>
      </motion.div>
    );
  }

  if (phase === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Get ready</p>
        <motion.div
          key={countdown}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-8xl font-display font-bold text-primary"
          style={{ textShadow: "0 0 50px hsl(var(--primary) / 0.5)" }}
        >
          {countdown}
        </motion.div>
      </div>
    );
  }

  if (phase === "evaluating") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-display font-bold text-foreground mb-2">Analyzing your roleplay...</h3>
        <p className="text-sm text-muted-foreground">Scoring all {userLines.length} lines and generating your study plan</p>
        <Loader2 className="w-5 h-5 text-primary animate-spin mt-4" />
      </div>
    );
  }

  // playing / userTurn / transition
  return (
    <div className="space-y-6">
      {/* Progress: user lines completed */}
      <div className="flex items-center gap-2">
        {userLines.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < userLinesDone ? "bg-primary" : "bg-secondary"
            }`}
          />
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Your lines: {userLinesDone} / {userLines.length}
      </p>

      {/* Current line card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`line-${currentIdx}-${phase}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={`glass-card p-6 ${isUserLine ? "border-primary/40" : "border-border/40"}`}
        >
          <div className="flex items-start gap-3">
            {isUserLine ? (
              <Mic className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            ) : (
              <MessageSquareQuote className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <p className={`text-xs font-medium mb-2 ${isUserLine ? "text-primary" : "text-muted-foreground"}`}>
                {isUserLine
                  ? `Your turn (${currentLine?.role}) — speak now:`
                  : `${currentLine?.role} says:`}
              </p>
              <p className="text-foreground leading-relaxed">{currentLine?.text}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Status / Controls */}
      {phase === "playing" && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4 animate-pulse">
          <Volume2 className="w-4 h-4" />
          AI is speaking...
        </div>
      )}

      {phase === "userTurn" && (
        <div className="flex flex-col items-center gap-4 py-2">
          <Waveform isActive={isRecording} />
          <VoiceButton
            isRecording={isRecording}
            isDisabled={false}
            onStart={handleStartUserRecording}
            onStop={handleStopRecording}
            duration={duration}
          />
          <p className="text-xs text-primary animate-pulse">
            {isRecording ? "🎙️ Recording... tap to stop when done" : "Tap the mic to record your line"}
          </p>
          {error && <p className="text-xs text-destructive text-center max-w-xs">{error}</p>}
        </div>
      )}

      {phase === "transition" && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-4">
          <Pause className="w-3.5 h-3.5" />
          Saved — moving to next line...
        </div>
      )}
    </div>
  );
}
