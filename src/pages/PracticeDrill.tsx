import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Loader2,
  Sparkles,
  Trophy,
} from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";
import { Waveform } from "@/components/Waveform";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FinalReview {
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

type Phase = "intro" | "wordDrill" | "sentenceDrill" | "complete";
type DrillResult = { passed: boolean; score: number; recognized: string };

export default function PracticeDrill() {
  const navigate = useNavigate();
  const location = useLocation();
  const finalReview = (location.state as { finalReview?: FinalReview })?.finalReview;

  const [phase, setPhase] = useState<Phase>("intro");
  const [drillIdx, setDrillIdx] = useState(0);
  const [attemptIdx, setAttemptIdx] = useState(0); // 0..2 (3 attempts each)
  const [results, setResults] = useState<Map<string, DrillResult[]>>(new Map());
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastResult, setLastResult] = useState<DrillResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording, duration } =
    useAudioRecorder();
  const waitingForBlob = useRef(false);

  const wordDrills = finalReview?.studyPlan.wordDrills || [];
  const sentenceDrills = finalReview?.studyPlan.sentenceDrills || [];
  const totalWords = wordDrills.length;
  const totalSentences = sentenceDrills.length;

  const currentItem =
    phase === "wordDrill"
      ? wordDrills[drillIdx]
      : phase === "sentenceDrill"
      ? sentenceDrills[drillIdx]
      : null;
  const currentText =
    phase === "wordDrill"
      ? (currentItem as any)?.word
      : (currentItem as any)?.sentence;
  const currentTip =
    phase === "wordDrill"
      ? (currentItem as any)?.phoneticTip
      : (currentItem as any)?.focus;
  const currentExample = phase === "wordDrill" ? (currentItem as any)?.exampleSentence : null;

  // === TTS ===
  const playTTS = useCallback(async (text: string) => {
    setIsPlaying(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
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
      await new Promise<void>((resolve) => {
        const a = new Audio(url);
        a.onended = () => { URL.revokeObjectURL(url); resolve(); };
        a.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        a.play();
      });
    } finally {
      setIsPlaying(false);
    }
  }, []);

  // === Evaluate ===
  const evaluate = useCallback(
    async (blob: Blob) => {
      if (!currentText) return;
      setIsEvaluating(true);
      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("referenceText", currentText);

        const fnName = phase === "wordDrill" ? "azure-word-eval" : "azure-pronunciation";
        const { data, error } = await supabase.functions.invoke(fnName, { body: formData });
        if (error) throw error;
        if (data.error) throw new Error(data.error);

        const score = phase === "wordDrill"
          ? data.accuracyScore || 0
          : data.scores?.pronScore || 0;
        const passed = score >= 75;
        const recognized = data.recognizedText || "";

        const result: DrillResult = { passed, score, recognized };
        setLastResult(result);
        setResults((prev) => {
          const next = new Map(prev);
          const key = `${phase}-${drillIdx}`;
          const arr = next.get(key) || [];
          next.set(key, [...arr, result]);
          return next;
        });
      } catch (err) {
        console.error("Drill eval error:", err);
        toast.error("Couldn't evaluate. Try again.");
      } finally {
        setIsEvaluating(false);
      }
    },
    [currentText, phase, drillIdx]
  );

  // When recording stops, evaluate
  useEffect(() => {
    if (audioBlob && waitingForBlob.current) {
      waitingForBlob.current = false;
      evaluate(audioBlob);
    }
  }, [audioBlob, evaluate]);

  const handleStop = useCallback(() => {
    waitingForBlob.current = true;
    stopRecording();
  }, [stopRecording]);

  const handleStart = useCallback(async () => {
    setLastResult(null);
    resetRecording();
    await startRecording();
  }, [resetRecording, startRecording]);

  const handleRetry = useCallback(() => {
    setLastResult(null);
    setAttemptIdx((a) => a + 1);
    resetRecording();
  }, [resetRecording]);

  const handleNext = useCallback(() => {
    setLastResult(null);
    setAttemptIdx(0);
    resetRecording();

    if (phase === "wordDrill") {
      if (drillIdx < totalWords - 1) {
        setDrillIdx((i) => i + 1);
      } else if (totalSentences > 0) {
        setDrillIdx(0);
        setPhase("sentenceDrill");
      } else {
        setPhase("complete");
      }
    } else if (phase === "sentenceDrill") {
      if (drillIdx < totalSentences - 1) {
        setDrillIdx((i) => i + 1);
      } else {
        setPhase("complete");
      }
    }
  }, [phase, drillIdx, totalWords, totalSentences, resetRecording]);

  const handleStart_Drill = useCallback(() => {
    if (totalWords > 0) {
      setPhase("wordDrill");
    } else if (totalSentences > 0) {
      setPhase("sentenceDrill");
    } else {
      setPhase("complete");
    }
    setDrillIdx(0);
    setAttemptIdx(0);
  }, [totalWords, totalSentences]);

  // === RENDER ===

  if (phase === "intro") {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-3" />
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">Personal Study Plan</h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Targeted practice for the words and sentences you struggled with. Real-time pronunciation feedback after every attempt.
              </p>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-display font-semibold text-foreground mb-2">Today's plan:</h3>
              <ul className="space-y-1.5 text-sm text-foreground">
                <li>🔤 <span className="text-primary font-semibold">{totalWords} word drills</span> — fix individual sounds</li>
                <li>💬 <span className="text-primary font-semibold">{totalSentences} sentence drills</span> — practice in context</li>
                <li>🎯 Up to 3 attempts each — pass at 75+ accuracy</li>
              </ul>
            </div>

            {finalReview.studyPlan.dailyRoutine && (
              <div className="glass-card p-4">
                <h4 className="text-xs font-display font-semibold text-primary mb-1">Daily routine</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{finalReview.studyPlan.dailyRoutine}</p>
              </div>
            )}

            <button
              onClick={handleStart_Drill}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              Start Practice <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    const allResults = Array.from(results.values()).flat();
    const passedCount = allResults.filter((r) => r.passed).length;

    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center">
            <Trophy className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-3xl font-display font-bold text-foreground">Practice Complete!</h1>
            <p className="text-muted-foreground">
              {passedCount} of {allResults.length} attempts passed
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/")}
                className="flex-1 py-3.5 rounded-xl border border-primary/30 text-primary font-display font-semibold hover:bg-primary/10 transition-all"
              >
                Home
              </button>
              <button
                onClick={() => navigate(-1)}
                className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                Practice Again
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // === Active drill (word or sentence) ===
  const totalForPhase = phase === "wordDrill" ? totalWords : totalSentences;
  const phaseLabel = phase === "wordDrill" ? "Word" : "Sentence";

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => setPhase("complete")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Drill
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-3">
          {Array.from({ length: totalForPhase }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < drillIdx ? "bg-primary" : i === drillIdx ? "bg-primary/60" : "bg-secondary"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mb-6">
          {phaseLabel} drill {drillIdx + 1} of {totalForPhase} • Attempt {attemptIdx + 1} of 3
        </p>

        {/* Drill card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`drill-${phase}-${drillIdx}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="glass-card p-6 border-primary/30 mb-6"
          >
            <p className="text-xs text-primary font-medium mb-3 uppercase tracking-wider">
              {phase === "wordDrill" ? "Say this word:" : "Say this sentence:"}
            </p>
            <p className={`text-foreground font-bold leading-relaxed ${phase === "wordDrill" ? "text-4xl text-center" : "text-lg"}`}>
              {currentText}
            </p>

            {currentTip && (
              <div className="mt-4 p-3 rounded-lg bg-secondary/40">
                <p className="text-xs text-primary font-medium mb-1">💡 Tip:</p>
                <p className="text-xs text-foreground">{currentTip}</p>
              </div>
            )}

            {currentExample && (
              <p className="text-xs text-muted-foreground italic mt-3">
                Example: "{currentExample}"
              </p>
            )}

            <button
              onClick={() => playTTS(currentText)}
              disabled={isPlaying}
              className="mt-4 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              <Volume2 className="w-3.5 h-3.5" />
              {isPlaying ? "Playing..." : "Listen first"}
            </button>
          </motion.div>
        </AnimatePresence>

        {/* Recording */}
        <div className="flex flex-col items-center gap-4 py-2">
          <Waveform isActive={isRecording} />
          <VoiceButton
            isRecording={isRecording}
            isDisabled={isEvaluating || lastResult !== null}
            onStart={handleStart}
            onStop={handleStop}
            duration={duration}
          />
          {isEvaluating && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluating...
            </div>
          )}
        </div>

        {/* Result */}
        {lastResult && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
            <div className={`glass-card p-5 border-2 ${lastResult.passed ? "border-score-high/40" : "border-destructive/40"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {lastResult.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-score-high" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                  <span className={`text-sm font-display font-semibold ${lastResult.passed ? "text-score-high" : "text-destructive"}`}>
                    {lastResult.passed ? "Great job!" : "Not quite — try again"}
                  </span>
                </div>
                <span className={`text-2xl font-display font-bold ${
                  lastResult.score >= 75 ? "text-score-high" : lastResult.score >= 50 ? "text-score-mid" : "text-score-low"
                }`}>
                  {lastResult.score}
                  <span className="text-xs text-muted-foreground font-normal">/100</span>
                </span>
              </div>
              {lastResult.recognized && (
                <p className="text-xs text-muted-foreground">
                  Heard: <span className="text-foreground italic">"{lastResult.recognized}"</span>
                </p>
              )}
            </div>

            <div className="flex gap-3">
              {!lastResult.passed && attemptIdx < 2 && (
                <button
                  onClick={handleRetry}
                  className="flex-1 py-3.5 rounded-xl border border-primary/30 text-primary font-display font-semibold hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Try Again
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                {drillIdx < totalForPhase - 1 || (phase === "wordDrill" && totalSentences > 0)
                  ? <>Next <ArrowRight className="w-4 h-4" /></>
                  : "Finish"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
