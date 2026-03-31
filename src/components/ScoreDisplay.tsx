import { motion } from "framer-motion";
import type { Scores } from "@/types/session";

interface ScoreDisplayProps {
  scores: Scores;
}

function getScoreColor(score: number): string {
  if (score >= 7) return "bg-score-high";
  if (score >= 4) return "bg-score-mid";
  return "bg-score-low";
}

function getScoreLabel(score: number): string {
  if (score >= 8) return "Excellent";
  if (score >= 6) return "Good";
  if (score >= 4) return "Fair";
  return "Needs work";
}

const SCORE_CATEGORIES: { key: keyof Scores; label: string }[] = [
  { key: "clarity", label: "Clarity" },
  { key: "structure", label: "Structure" },
  { key: "completeness", label: "Completeness" },
];

export function ScoreDisplay({ scores }: ScoreDisplayProps) {
  const average = Math.round(((scores.clarity + scores.structure + scores.completeness) / 3) * 10) / 10;

  return (
    <div className="space-y-5">
      {/* Average score */}
      <div className="flex items-center gap-3">
        <div className="text-4xl font-display font-bold text-foreground glow-text">
          {average}
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="block font-medium text-foreground">{getScoreLabel(average)}</span>
          Overall score
        </div>
      </div>

      {/* Individual scores */}
      <div className="space-y-3">
        {SCORE_CATEGORIES.map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-foreground">{scores[key]}/10</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${getScoreColor(scores[key])}`}
                initial={{ width: 0 }}
                animate={{ width: `${scores[key] * 10}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
