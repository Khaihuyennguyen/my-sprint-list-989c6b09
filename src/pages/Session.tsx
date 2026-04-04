import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Volume2, Loader2 } from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";
import { Waveform } from "@/components/Waveform";
import { QuestionCard } from "@/components/QuestionCard";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { SessionProgress } from "@/components/SessionProgress";
import { SessionSummary } from "@/components/SessionSummary";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSessionEvaluation } from "@/hooks/useSessionEvaluation";
import { useQuestions } from "@/hooks/useQuestions";
import {
  type Track,
  type Difficulty,
  type QuestionEntry,
} from "@/types/session";
import { saveSession } from "@/lib/sessionHistory";
import { toast } from "sonner";

const TOTAL_QUESTIONS = 3;

export default function Session() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const track = (searchParams.get("track") || "sql") as Track;
  const difficulty = (searchParams.get("difficulty") || "medium") as Difficulty;

  const { questions, loading: questionsLoading, error: questionsError } = useQuestions(track, difficulty, TOTAL_QUESTIONS);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [entries, setEntries] = useState<QuestionEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "feedback" | "summary">("idle");
  const waitingForBlob = useRef(false);

  // Initialize entries when questions load
  useEffect(() => {
    if (questions.length > 0) {
      setEntries(
        questions.map((q, i) => ({
          questionIndex: i,
          questionText: q.text,
          expectedAnswer: q.expectedAnswer,
          transcript: null,
          scores: null,
          feedbackText: null,
          audioUrl: null,
        }))
      );
    }
  }, [questions]);

  // Handle question loading error
  useEffect(() => {
    if (questionsError) {
      toast.error(questionsError);
      navigate("/");
    }
  }, [questionsError, navigate]);

  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording, duration, error } = useAudioRecorder();
  const { processAnswer, speakFeedback, stopSpeaking, isSpeaking } = useSessionEvaluation();

  const currentEntry = entries[currentIndex];
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // When audioBlob becomes available after recording, trigger evaluation
  useEffect(() => {
    if (audioBlob && waitingForBlob.current) {
      waitingForBlob.current = false;
      const idx = currentIndexRef.current;
      const entry = entries[idx];

      (async () => {
        try {
          const result = await processAnswer(audioBlob, entry.questionText, track, difficulty, entry.expectedAnswer);
          setEntries((prev) =>
            prev.map((e, i) =>
              i === idx
                ? { ...e, transcript: result.transcript, scores: result.scores, feedbackText: result.feedbackText }
                : e
            )
          );
          setStatus("feedback");
          if (result.feedbackText) speakFeedback(result.feedbackText);
        } catch (err) {
          console.error("Evaluation error:", err);
          toast.error("Evaluation failed. Try again or use demo skip.");
          setStatus("idle");
        }
      })();
    }
  }, [audioBlob]);

  const handleStartRecording = useCallback(async () => {
    resetRecording();
    stopSpeaking();
    await startRecording();
    setStatus("listening");
  }, [startRecording, resetRecording, stopSpeaking]);

  const handleStopAndEvaluate = useCallback(() => {
    waitingForBlob.current = true;
    stopRecording();
    setStatus("processing");
  }, [stopRecording]);

  const handleDemoSkip = useCallback(async () => {
    setStatus("processing");
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error: fnError } = await supabase.functions.invoke("evaluate", {
        body: {
          question: currentEntry.questionText,
          transcript: "I would approach this by first understanding the data structure, then writing a query that uses appropriate joins and aggregations. I'd consider edge cases like null values and ensure the query performs well with proper indexing.",
          track,
          difficulty,
        },
      });

      if (fnError) throw fnError;

      const demoTranscript = "I would approach this by first understanding the data structure, then writing a query that uses appropriate joins and aggregations. I'd consider edge cases like null values and ensure the query performs well with proper indexing.";

      setEntries((prev) =>
        prev.map((e, i) =>
          i === currentIndex
            ? { ...e, transcript: demoTranscript, scores: data.scores, feedbackText: data.feedbackText }
            : e
        )
      );
      setStatus("feedback");
      if (data.feedbackText) speakFeedback(data.feedbackText);
    } catch (err) {
      console.error("Demo evaluation error:", err);
      toast.error("Evaluation failed. Using simulated scores.");
      const scores = { clarity: 7, structure: 6, completeness: 6 };
      setEntries((prev) =>
        prev.map((e, i) =>
          i === currentIndex
            ? { ...e, transcript: "Demo answer (simulated)", scores, feedbackText: "Good approach! Try to be more specific about syntax." }
            : e
        )
      );
      setStatus("feedback");
    }
  }, [currentIndex, currentEntry?.questionText, track, difficulty, speakFeedback]);

  const handleNextQuestion = useCallback(async () => {
    stopSpeaking();
    if (currentIndex < TOTAL_QUESTIONS - 1) {
      setCurrentIndex((i) => i + 1);
      setStatus("idle");
      resetRecording();
    } else {
      await saveSession(track, difficulty, entries);
      setStatus("summary");
    }
  }, [currentIndex, resetRecording, stopSpeaking, track, difficulty, entries]);

  if (questionsLoading || entries.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (status === "summary") {
    return (
      <div className="min-h-screen px-4 py-12">
        <SessionSummary questions={entries} onNewSession={() => navigate("/")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => { stopSpeaking(); navigate("/"); }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit
          </button>
          <div className="flex items-center gap-3">
            {isSpeaking && (
              <button onClick={stopSpeaking} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                Stop
              </button>
            )}
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {track.replace("-", " ")} · {difficulty}
            </div>
          </div>
        </div>

        <SessionProgress currentIndex={currentIndex} totalQuestions={TOTAL_QUESTIONS} />

        <div className="mt-8 space-y-8">
          <AnimatePresence mode="wait">
            <QuestionCard key={currentIndex} questionIndex={currentIndex} totalQuestions={TOTAL_QUESTIONS} questionText={currentEntry.questionText} />
          </AnimatePresence>

          <div className="flex flex-col items-center gap-6 py-4">
            <Waveform isActive={isRecording} />
            <VoiceButton
              isRecording={isRecording}
              isDisabled={status === "processing"}
              onStart={handleStartRecording}
              onStop={handleStopAndEvaluate}
              duration={duration}
            />
            {error && (
              <div className="text-center space-y-2">
                <p className="text-sm text-destructive">{error}</p>
                <button onClick={handleDemoSkip} className="text-xs text-primary underline hover:brightness-125">
                  Skip with demo answer →
                </button>
              </div>
            )}
            {status === "idle" && !error && (
              <button onClick={handleDemoSkip} className="text-xs text-muted-foreground hover:text-primary underline transition-colors">
                or skip with demo answer
              </button>
            )}
            {status === "processing" && (
              <p className="text-xs text-muted-foreground animate-pulse">Transcribing & evaluating your answer...</p>
            )}
          </div>

          <TranscriptPanel transcript={currentEntry.transcript} feedbackText={currentEntry.feedbackText} isProcessing={status === "processing"} />

          {status === "feedback" && currentEntry.scores && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <ScoreDisplay scores={currentEntry.scores} />
            </motion.div>
          )}

          {status === "feedback" && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleNextQuestion}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              {currentIndex < TOTAL_QUESTIONS - 1 ? "Next Question →" : "View Summary"}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
