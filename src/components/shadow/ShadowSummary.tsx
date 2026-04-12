import { motion } from "framer-motion";
import { Trophy, RotateCcw } from "lucide-react";
import type { SegmentResult } from "@/types/shadow";

interface Props {
  results: SegmentResult[];
  videoTitle: string;
  onRestart: () => void;
}

export function ShadowSummary({ results, videoTitle, onRestart }: Props) {
  const completedResults = results.filter((r) => r.scores);
  const avgScores = completedResults.length > 0
    ? {
        pronunciation: avg(completedResults, (r) => r.scores!.pronunciation),
        fluency: avg(completedResults, (r) => r.scores!.fluency),
        intonation: avg(completedResults, (r) => r.scores!.intonation),
        connectedSpeech: avg(completedResults, (r) => r.scores!.connectedSpeech),
        accentClarity: avg(completedResults, (r) => r.scores!.accentClarity),
        confidence: avg(completedResults, (r) => r.scores!.confidence),
      }
    : null;

  const overallAvg = completedResults.length > 0
    ? +(completedResults.reduce((sum, r) => sum + (r.overallScore || 0), 0) / completedResults.length).toFixed(1)
    : 0;

  const allWordIssues = completedResults.flatMap((r) => r.wordIssues || []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground">Shadow Session Complete!</h2>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{videoTitle}</p>
      </div>

      {/* Overall Score */}
      <div className="glass-card p-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
        <div className="text-5xl font-display font-bold text-primary">{overallAvg}</div>
        <p className="text-sm text-muted-foreground mt-1">/10</p>
        <p className="text-xs text-muted-foreground mt-3">
          {completedResults.length} of {results.length} segments evaluated
        </p>
      </div>

      {/* Score Breakdown */}
      {avgScores && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-display font-semibold mb-4">Score Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: "Pronunciation", value: avgScores.pronunciation, weight: "25%" },
              { label: "Fluency", value: avgScores.fluency, weight: "20%" },
              { label: "Intonation & Rhythm", value: avgScores.intonation, weight: "20%" },
              { label: "Connected Speech", value: avgScores.connectedSpeech, weight: "15%" },
              { label: "Accent Clarity", value: avgScores.accentClarity, weight: "10%" },
              { label: "Confidence & Expression", value: avgScores.confidence, weight: "10%" },
            ].map(({ label, value, weight }) => {
              const color = value >= 8 ? "bg-score-high" : value >= 5 ? "bg-score-mid" : "bg-score-low";
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground">{label} <span className="text-muted-foreground">({weight})</span></span>
                    <span className="font-semibold">{value.toFixed(1)}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${value * 10}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Word Issues */}
      {allWordIssues.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-display font-semibold mb-3">Words to Practice</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {allWordIssues.slice(0, 15).map((w, i) => (
              <div key={i} className="p-2 rounded-lg bg-secondary/40 text-xs">
                <span className="font-semibold text-destructive">"{w.word}"</span>
                <span className="text-muted-foreground ml-1">— {w.issue}</span>
                <p className="text-primary mt-0.5">💡 {w.tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onRestart}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2"
        style={{ boxShadow: "var(--shadow-glow)" }}
      >
        <RotateCcw className="w-4 h-4" />
        New Shadow Session
      </button>
    </motion.div>
  );
}

function avg(items: any[], fn: (item: any) => number): number {
  return items.reduce((sum, item) => sum + fn(item), 0) / items.length;
}
