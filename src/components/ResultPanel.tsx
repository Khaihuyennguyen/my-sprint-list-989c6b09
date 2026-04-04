import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error: string | null;
}

interface ResultPanelProps {
  results: TestResult[] | null;
  total: number;
  passed: number;
  loading: boolean;
  language: "python" | "sql";
}

function SqlTable({ csv }: { csv: string }) {
  const lines = csv.split("\n").filter(Boolean);
  if (lines.length === 0) return <span className="text-muted-foreground">No output</span>;
  const headers = lines[0].split(",");
  const rows = lines.slice(1).map((l) => l.split(","));

  return (
    <div className="overflow-auto rounded border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-secondary/60">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-1.5 text-left font-medium text-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1 text-muted-foreground">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultPanel({ results, total, passed, loading, language }: ResultPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-8 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        Running test cases...
      </div>
    );
  }

  if (!results) {
    return (
      <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-8 text-center text-muted-foreground text-sm">
        Run your code to see results here
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* Summary bar */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Test Results</span>
        <Badge variant={passed === total ? "default" : "destructive"} className="font-mono">
          {passed}/{total} passed
        </Badge>
      </div>

      {/* Individual results */}
      <div className="divide-y divide-border">
        {results.map((r, i) => (
          <div key={i} className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              {r.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className={`text-sm font-medium ${r.passed ? "text-emerald-400" : "text-red-400"}`}>
                Test Case {i + 1}
              </span>
            </div>

            {!r.passed && (
              <div className="ml-6 space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Input: </span>
                  <code className="text-foreground bg-secondary/60 px-1.5 py-0.5 rounded">{r.input}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Expected: </span>
                  {language === "sql" ? <SqlTable csv={r.expected} /> : (
                    <code className="text-emerald-400 bg-secondary/60 px-1.5 py-0.5 rounded">{r.expected}</code>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Got: </span>
                  {language === "sql" && r.actual && !r.error ? <SqlTable csv={r.actual} /> : (
                    <code className="text-red-400 bg-secondary/60 px-1.5 py-0.5 rounded">{r.actual || "(no output)"}</code>
                  )}
                </div>
                {r.error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-red-400 font-mono whitespace-pre-wrap">
                    {r.error}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
