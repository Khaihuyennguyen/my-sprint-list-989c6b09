import { motion } from "framer-motion";
import { ScoreDisplay } from "./ScoreDisplay";
import { ArrowRight, RotateCcw } from "lucide-react";
import type { QuestionEntry, Scores } from "@/types/session";

interface SessionSummaryProps {
  questions: QuestionEntry[];
  onNewSession: () => void;
}

export function SessionSummary({ questions, onNewSession }: SessionSummaryProps) {
  const completedQuestions = questions.filter((q) => q.scores);

  const averageScores: Scores = {
    clarity: Math.round(
      completedQuestions.reduce((sum, q) => sum + (q.scores?.clarity || 0), 0) / completedQuestions.length
    ),
    structure: Math.round(
      completedQuestions.reduce((sum, q) => sum + (q.scores?.structure || 0), 0) / completedQuestions.length
    ),
    completeness: Math.round(
      completedQuestions.reduce((sum, q) => sum + (q.scores?.completeness || 0), 0) / completedQuestions.length
    ),
  };

  const overallAvg = Math.round(((averageScores.clarity + averageScores.structure + averageScores.completeness) / 3) * 10) / 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="text-5xl"
        >
          {overallAvg >= 7 ? "🎉" : overallAvg >= 5 ? "👍" : "💪"}
        </motion.div>
        <h2 className="text-2xl font-display font-bold text-foreground">Session Complete</h2>
        <p className="text-muted-foreground">
          Here&apos;s how you performed across {completedQuestions.length} questions
        </p>
      </div>

      {/* Overall scores */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Overall Performance
        </h3>
        <ScoreDisplay scores={averageScores} />
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Question Breakdown
        </h3>
        {questions.map((q, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className="glass-card p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <span className="text-xs text-primary font-medium">Q{i + 1}</span>
                <p className="text-sm font-medium text-foreground mt-0.5">{q.questionText}</p>
              </div>
              {q.scores && (
                <div className="text-right shrink-0">
                  <span className="text-lg font-display font-bold text-foreground">
                    {Math.round(((q.scores.clarity + q.scores.structure + q.scores.completeness) / 3) * 10) / 10}
                  </span>
                  <span className="text-xs text-muted-foreground block">/10</span>
                </div>
              )}
            </div>
            {q.feedbackText && (
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                {q.feedbackText}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onNewSession}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <RotateCcw className="w-4 h-4" />
          New Session
        </button>
        <button
          onClick={onNewSession}
          className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-secondary text-secondary-foreground font-display font-medium hover:bg-secondary/80 transition-all"
        >
          Home
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
