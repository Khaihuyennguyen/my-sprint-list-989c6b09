import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Mic, Loader2, ArrowRight, MessageSquareQuote } from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";
import { Waveform } from "@/components/Waveform";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSessionEvaluation } from "@/hooks/useSessionEvaluation";
import type { DialogueLine, SegmentResult } from "@/types/shadow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  userSegments: DialogueLine[];
  currentIndex: number;
  context: DialogueLine[];
  result: SegmentResult | null;
  isEvaluating: boolean;
  onEvaluate: (blob: Blob, idx: number) => Promise<any>;
  onNext: () => void;
  totalSegments: number;
}

export function ShadowPlayer({
  userSegments,
  currentIndex,
  context,
  result,
  isEvaluating,
  onEvaluate,
  onNext,
  totalSegments,
}: Props) {
  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording, duration, error } =
    useAudioRecorder();
  const { speakFeedback, stopSpeaking, isSpeaking } = useSessionEvaluation();
  const [phase, setPhase] = useState<"listen" | "record" | "evaluating" | "feedback">("listen");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const waitingForBlob = useRef(false);

  const currentLine = userSegments[currentIndex];

  useEffect(() => {
    setPhase("listen");
    resetRecording();
  }, [currentIndex, resetRecording]);

  // Read the other role's line via TTS
  const handlePlayContext = useCallback(() => {
    if (context.length > 0) {
      speakFeedback(context[0].text);
    }
  }, [context, speakFeedback]);

  const handleStartRecording = useCallback(async () => {
    stopSpeaking();
    resetRecording();
    await startRecording();
    setPhase("record");
  }, [startRecording, resetRecording, stopSpeaking]);

  const handleStopRecording = useCallback(() => {
    waitingForBlob.current = true;
    stopRecording();
  }, [stopRecording]);

  useEffect(() => {
    if (audioBlob && waitingForBlob.current) {
      waitingForBlob.current = false;
      setPendingBlob(audioBlob);
      setShowConfirm(true);
    }
  }, [audioBlob]);

  const handleConfirm = useCallback(async () => {
    setShowConfirm(false);
    const blob = pendingBlob;
    setPendingBlob(null);
    if (!blob) return;
    setPhase("evaluating");
    const res = await onEvaluate(blob, currentIndex);
    if (res) {
      setPhase("feedback");
      if (res.feedback) speakFeedback(res.feedback);
    } else {
      setPhase("listen");
    }
  }, [pendingBlob, currentIndex, onEvaluate, speakFeedback]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
    setPendingBlob(null);
    setPhase("listen");
    resetRecording();
  }, [resetRecording]);

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSegments }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < currentIndex
                ? "bg-primary"
                : i === currentIndex
                ? "bg-primary/60"
                : "bg-secondary"
            }`}
          />
        ))}
      </div>

      {/* Context (other speaker's line) */}
      <AnimatePresence mode="wait">
        {context.length > 0 && (
          <motion.div
            key={`ctx-${currentIndex}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="glass-card p-4"
          >
            <div className="flex items-start gap-3">
              <MessageSquareQuote className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  {context[0].role} says:
                </p>
                <p className="text-sm text-foreground">{context[0].text}</p>
              </div>
            </div>
            <button
              onClick={handlePlayContext}
              className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors ml-8"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Listen
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User's line to read */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`line-${currentIndex}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="glass-card p-6 border-primary/20"
        >
          <div className="flex items-start gap-3">
            <Mic className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-primary font-medium mb-1">
                Your turn ({currentLine?.role}):
              </p>
              <p className="text-foreground font-medium leading-relaxed">{currentLine?.text}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Recording controls */}
      <div className="flex flex-col items-center gap-4 py-2">
        <Waveform isActive={isRecording} />
        <VoiceButton
          isRecording={isRecording}
          isDisabled={phase === "evaluating" || isEvaluating}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          duration={duration}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        {(phase === "evaluating" || isEvaluating) && (
          <p className="text-xs text-muted-foreground animate-pulse">Evaluating your pronunciation...</p>
        )}
      </div>

      {/* Feedback */}
      {phase === "feedback" && result?.scores && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass-card p-6">
            <h3 className="text-sm font-display font-semibold text-foreground mb-3">Pronunciation Scores</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "pronunciation", label: "Pronunciation", weight: "25%" },
                { key: "fluency", label: "Fluency", weight: "20%" },
                { key: "intonation", label: "Intonation", weight: "20%" },
                { key: "connectedSpeech", label: "Connected Speech", weight: "15%" },
                { key: "accentClarity", label: "Accent Clarity", weight: "10%" },
                { key: "confidence", label: "Confidence", weight: "10%" },
              ].map(({ key, label, weight }) => {
                const score = (result.scores as any)?.[key] || 0;
                const color = score >= 8 ? "text-score-high" : score >= 5 ? "text-score-mid" : "text-score-low";
                return (
                  <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-secondary/40">
                    <div>
                      <p className="text-xs font-medium text-foreground">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{weight}</p>
                    </div>
                    <span className={`text-lg font-display font-bold ${color}`}>{score}</span>
                  </div>
                );
              })}
            </div>
            {result.overallScore && (
              <div className="mt-3 text-center">
                <span className="text-xs text-muted-foreground">Overall: </span>
                <span className="text-xl font-display font-bold text-primary">{result.overallScore}</span>
                <span className="text-xs text-muted-foreground">/10</span>
              </div>
            )}
          </div>

          {result.feedback && (
            <div className="glass-card p-4">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.feedback}</p>
            </div>
          )}

          {result.wordIssues && result.wordIssues.length > 0 && (
            <div className="glass-card p-4">
              <h4 className="text-xs font-display font-semibold text-foreground mb-2">Words to Practice</h4>
              <div className="space-y-2">
                {result.wordIssues.map((w, i) => (
                  <div key={i} className="p-2 rounded-lg bg-secondary/40 text-xs">
                    <span className="font-semibold text-destructive">"{w.word}"</span>
                    <span className="text-muted-foreground ml-1">— {w.issue}</span>
                    <p className="text-primary mt-0.5">💡 {w.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                stopSpeaking();
                resetRecording();
                setPhase("listen");
              }}
              className="flex-1 py-3.5 rounded-xl border border-primary/30 text-primary font-display font-semibold hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
            >
              <Mic className="w-4 h-4" />
              Try Again
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onNext}
              className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              {currentIndex < totalSegments - 1 ? (
                <>Next Line <ArrowRight className="w-4 h-4" /></>
              ) : (
                "View Summary"
              )}
            </motion.button>
          </div>
        </motion.div>
      )}

      <AlertDialog open={showConfirm} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit for pronunciation evaluation?</AlertDialogTitle>
            <AlertDialogDescription>
              Your recording will be transcribed and compared against the expected text. This uses API credits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Re-record</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Evaluate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
