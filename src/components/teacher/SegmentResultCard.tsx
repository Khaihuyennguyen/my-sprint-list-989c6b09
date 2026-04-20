import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { TeacherResult } from "@/hooks/useTeacherSession";

interface Props {
  result: TeacherResult;
}

function scoreClass(score: number): string {
  if (score >= 80) return "text-score-high";
  if (score >= 60) return "text-score-mid";
  return "text-score-low";
}

function wordBgClass(score: number): string {
  if (score >= 80) return "bg-score-high/15 text-score-high border-score-high/30";
  if (score >= 60) return "bg-score-mid/15 text-score-mid border-score-mid/30";
  return "bg-score-low/15 text-score-low border-score-low/30";
}

/** Cheap word-level diff: mark expected words missing from recognized text. */
function diffWords(expected: string, recognized: string) {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[.,!?;:"']/g, "").trim();
  const recSet = new Set(norm(recognized).split(/\s+/).filter(Boolean));
  return expected.split(/\s+/).map((w) => ({
    word: w,
    matched: recSet.has(norm(w)),
  }));
}

export function SegmentResultCard({ result }: Props) {
  const [open, setOpen] = useState(false);
  const best = result.attempts.reduce(
    (b, a) => (a.azureScores.pronScore > (b?.azureScores.pronScore ?? -1) ? a : b),
    result.attempts[0]
  );
  const hasData = !!best && best.recognizedText !== undefined;

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-foreground flex-1">"{result.segment.expectedText}"</p>
        <div className="text-right shrink-0">
          <span className={`text-lg font-bold ${scoreClass(result.bestScore)}`}>
            {result.bestScore}
          </span>
          <p className="text-[10px] text-muted-foreground">
            {result.attempts.length === 0 ? "skipped" : `${result.attempts.length} attempt`}
          </p>
        </div>
      </div>

      {hasData && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          aria-expanded={open}
        >
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {open ? "Hide details" : "Show details"}
        </button>
      )}

      {open && hasData && best && (
        <div className="mt-3 space-y-3 pt-3 border-t border-border/40">
          {/* Per-word color breakdown */}
          {best.problemWords && best.azureScores && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Word accuracy
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.segment.expectedText.split(/\s+/).map((word, i) => {
                  const cleanWord = word.toLowerCase().replace(/[.,!?;:"']/g, "");
                  // Find this word in problemWords (anything not in problemWords scored well)
                  const problem = best.problemWords.find(
                    (p) => p.word.toLowerCase().replace(/[.,!?;:"']/g, "") === cleanWord
                  );
                  const score = problem?.accuracyScore ?? 90; // assume good if not flagged
                  return (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded-md text-xs font-medium border ${wordBgClass(score)}`}
                      title={`Accuracy: ${Math.round(score)}`}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recognized vs expected diff */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              What Azure heard
            </p>
            <p className="text-xs text-foreground italic mb-2">
              "{best.recognizedText || <span className="text-muted-foreground">(silence)</span>}"
            </p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Missing words from your speech
            </p>
            <div className="flex flex-wrap gap-1">
              {diffWords(result.segment.expectedText, best.recognizedText || "").map((w, i) => (
                <span
                  key={i}
                  className={`text-xs ${
                    w.matched ? "text-muted-foreground" : "text-destructive font-semibold underline"
                  }`}
                >
                  {w.word}
                </span>
              ))}
            </div>
          </div>

          {/* Score breakdown */}
          {best.azureScores && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground">Accuracy</p>
                <p className={`text-sm font-bold ${scoreClass(best.azureScores.accuracyScore)}`}>
                  {Math.round(best.azureScores.accuracyScore)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Fluency</p>
                <p className={`text-sm font-bold ${scoreClass(best.azureScores.fluencyScore)}`}>
                  {Math.round(best.azureScores.fluencyScore)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Completeness</p>
                <p className={`text-sm font-bold ${scoreClass(best.azureScores.completenessScore)}`}>
                  {Math.round(best.azureScores.completenessScore)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
