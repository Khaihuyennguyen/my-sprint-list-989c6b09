import { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";
import { Waveform } from "@/components/Waveform";
import { QuestionCard } from "@/components/QuestionCard";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { SessionProgress } from "@/components/SessionProgress";
import { SessionSummary } from "@/components/SessionSummary";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import {
  SAMPLE_QUESTIONS,
  type Track,
  type Difficulty,
  type QuestionEntry,
  type Scores,
} from "@/types/session";
import { saveSession } from "@/lib/sessionHistory";

const TOTAL_QUESTIONS = 3;

// Simulate AI evaluation (will be replaced with real API calls)
function simulateEvaluation(): Promise<{ transcript: string; scores: Scores; feedbackText: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const scores: Scores = {
        clarity: Math.floor(Math.random() * 4) + 6,
        structure: Math.floor(Math.random() * 4) + 5,
        completeness: Math.floor(Math.random() * 4) + 5,
      };
      resolve({
        transcript:
          "I would approach this by first understanding the data structure, then writing a query that uses appropriate joins and aggregations. I'd consider edge cases like null values and ensure the query performs well with proper indexing.",
        scores,
        feedbackText:
          "Good structured approach! You mentioned edge cases which is great. To improve, try to be more specific about the exact SQL syntax you'd use, and discuss query optimization techniques like explaining the execution plan. Consider mentioning specific index strategies.",
      });
    }, 2500);
  });
}

export default function Session() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const track = (searchParams.get("track") || "sql") as Track;
  const difficulty = (searchParams.get("difficulty") || "medium") as Difficulty;

  const questions = useMemo(() => {
    const pool = SAMPLE_QUESTIONS[track]?.[difficulty] || SAMPLE_QUESTIONS.sql.medium;
    // Pick 3 random questions
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, TOTAL_QUESTIONS);
  }, [track, difficulty]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [entries, setEntries] = useState<QuestionEntry[]>(
    questions.map((q, i) => ({
      questionIndex: i,
      questionText: q,
      transcript: null,
      scores: null,
      feedbackText: null,
      audioUrl: null,
    }))
  );
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "feedback" | "summary">("idle");

  const { isRecording, startRecording, stopRecording, resetRecording, duration, error } = useAudioRecorder();

  const currentEntry = entries[currentIndex];

  const handleStartRecording = useCallback(async () => {
    resetRecording();
    await startRecording();
    setStatus("listening");
  }, [startRecording, resetRecording]);

  const handleStopRecording = useCallback(async () => {
    stopRecording();
    setStatus("processing");

    // Simulate evaluation
    const result = await simulateEvaluation();

    setEntries((prev) =>
      prev.map((e, i) =>
        i === currentIndex
          ? { ...e, transcript: result.transcript, scores: result.scores, feedbackText: result.feedbackText }
          : e
      )
    );
    setStatus("feedback");
  }, [stopRecording, currentIndex]);

  // Demo mode: skip recording and simulate evaluation
  const handleDemoSkip = useCallback(async () => {
    setStatus("processing");
    const result = await simulateEvaluation();
    setEntries((prev) =>
      prev.map((e, i) =>
        i === currentIndex
          ? { ...e, transcript: result.transcript, scores: result.scores, feedbackText: result.feedbackText }
          : e
      )
    );
    setStatus("feedback");
  }, [currentIndex]);

  const handleNextQuestion = useCallback(() => {
    if (currentIndex < TOTAL_QUESTIONS - 1) {
      setCurrentIndex((i) => i + 1);
      setStatus("idle");
      resetRecording();
    } else {
      setStatus("summary");
    }
  }, [currentIndex, resetRecording]);

  if (status === "summary") {
    return (
      <div className="min-h-screen px-4 py-12">
        <SessionSummary questions={entries} onNewSession={() => navigate("/")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "var(--gradient-glow)" }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit
          </button>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {track.replace("-", " ")} · {difficulty}
          </div>
        </div>

        {/* Progress */}
        <SessionProgress currentIndex={currentIndex} totalQuestions={TOTAL_QUESTIONS} />

        <div className="mt-8 space-y-8">
          {/* Question */}
          <AnimatePresence mode="wait">
            <QuestionCard
              key={currentIndex}
              questionIndex={currentIndex}
              totalQuestions={TOTAL_QUESTIONS}
              questionText={currentEntry.questionText}
            />
          </AnimatePresence>

          {/* Voice input area */}
          <div className="flex flex-col items-center gap-6 py-4">
            <Waveform isActive={isRecording} />
            <VoiceButton
              isRecording={isRecording}
              isDisabled={status === "processing"}
              onStart={handleStartRecording}
              onStop={handleStopRecording}
              duration={duration}
            />
            {error && (
              <div className="text-center space-y-2">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  onClick={handleDemoSkip}
                  className="text-xs text-primary underline hover:brightness-125"
                >
                  Skip with demo answer →
                </button>
              </div>
            )}
            {status === "idle" && !error && (
              <button
                onClick={handleDemoSkip}
                className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
              >
                or skip with demo answer
              </button>
            )}
          </div>

          {/* Transcript + Feedback */}
          <TranscriptPanel
            transcript={currentEntry.transcript}
            feedbackText={currentEntry.feedbackText}
            isProcessing={status === "processing"}
          />

          {/* Scores */}
          {status === "feedback" && currentEntry.scores && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <ScoreDisplay scores={currentEntry.scores} />
            </motion.div>
          )}

          {/* Next button */}
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
