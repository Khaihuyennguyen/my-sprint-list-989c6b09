import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CodeEditor } from "@/components/CodeEditor";
import { ResultPanel } from "@/components/ResultPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
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

interface CodingProblem {
  id: string;
  title: string;
  description: string;
  track: string;
  difficulty: string;
  boilerplate_python: string;
  boilerplate_sql: string;
  test_cases: any[];
}

interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error: string | null;
}

const LOCAL_STORAGE_PREFIX = "voiceprep_code_";

export default function Practice() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [language, setLanguage] = useState<"python" | "sql">("python");
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [totalPassed, setTotalPassed] = useState(0);
  const [totalTests, setTotalTests] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ scores: { correctness: number; style: number; efficiency: number }; feedbackText: string } | null>(null);

  const filterTrack = searchParams.get("track") || "python";

  // Fetch problems
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from("coding_problems")
        .select("*")
        .eq("track", filterTrack)
        .eq("is_active", true)
        .order("difficulty")
        .order("title");

      if (error) {
        toast.error("Failed to load problems");
        console.error(error);
      } else {
        setProblems((data as CodingProblem[]) || []);
        setCurrentIndex(0);
      }
      setLoading(false);
    }
    fetch();
  }, [filterTrack]);

  const problem = problems[currentIndex] || null;

  // Load code from localStorage or boilerplate when problem changes
  useEffect(() => {
    if (!problem) return;
    setResults(null);
    setTotalPassed(0);
    setTotalTests(0);
    setAiFeedback(null);

    const savedCode = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${problem.id}_${language}`);
    if (savedCode) {
      setCode(savedCode);
    } else {
      setCode(language === "python" ? problem.boilerplate_python : problem.boilerplate_sql);
    }
  }, [problem?.id, language]);

  // Auto-save code
  useEffect(() => {
    if (!problem) return;
    const timer = setTimeout(() => {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${problem.id}_${language}`, code);
    }, 500);
    return () => clearTimeout(timer);
  }, [code, problem?.id, language]);

  // Set language based on track
  useEffect(() => {
    setLanguage(filterTrack === "sql" ? "sql" : "python");
  }, [filterTrack]);

  const handleRun = useCallback(async () => {
    if (!problem) return;
    setRunning(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("submit", {
        body: { code, language, problem_id: problem.id },
      });

      if (error) throw error;

      setResults(data.results);
      setTotalPassed(data.passed);
      setTotalTests(data.total);

      if (data.all_passed) {
        toast.success("All test cases passed! 🎉");
      }
    } catch (e: any) {
      toast.error(e.message || "Execution failed");
    } finally {
      setRunning(false);
    }
  }, [problem, code, language]);

  const handleAnalyze = useCallback(async () => {
    if (!problem) return;
    setAnalyzing(true);
    setAiFeedback(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-code", {
        body: {
          code,
          language,
          problem_description: problem.description,
          solution: (problem as any).solution || "",
          test_results: results,
        },
      });

      if (error) throw error;
      setAiFeedback(data);
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [problem, code, language, results]);

  const diffColor = (d: string) => {
    if (d === "easy") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (d === "medium") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading problems...
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-display font-bold text-foreground">Code Practice</h1>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterTrack} onValueChange={(v) => setSearchParams({ track: v })}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">🐍 Python</SelectItem>
                <SelectItem value="sql">🗄️ SQL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {problems.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No problems found for this track.
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Problem description */}
            <div className="space-y-4">
              {/* Problem navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((i) => i - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground font-mono">
                    {currentIndex + 1} / {problems.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={currentIndex === problems.length - 1}
                    onClick={() => setCurrentIndex((i) => i + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                {problem && (
                  <Badge variant="outline" className={diffColor(problem.difficulty)}>
                    {problem.difficulty}
                  </Badge>
                )}
              </div>

              {/* Problem card */}
              {problem && (
                <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 space-y-4">
                  <h2 className="text-lg font-display font-semibold text-foreground">{problem.title}</h2>
                  <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {problem.description.split("```").map((block, i) =>
                      i % 2 === 1 ? (
                        <pre key={i} className="bg-secondary/60 rounded-lg p-3 text-xs text-foreground overflow-x-auto my-2">
                          <code>{block.replace(/^\w*\n/, "")}</code>
                        </pre>
                      ) : (
                        <span key={i}>
                          {block.split(/(`[^`]+`)/).map((seg, j) =>
                            seg.startsWith("`") && seg.endsWith("`") ? (
                              <code key={j} className="bg-secondary/60 px-1 py-0.5 rounded text-foreground text-xs">
                                {seg.slice(1, -1)}
                              </code>
                            ) : (
                              <span key={j}>{seg}</span>
                            )
                          )}
                        </span>
                      )
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {problem.test_cases.length} test case{problem.test_cases.length !== 1 ? "s" : ""}
                  </div>
                </div>
              )}

              {/* Result Panel (mobile: below problem, desktop: below problem) */}
              <div className="lg:hidden">
                <ResultPanel results={results} total={totalTests} passed={totalPassed} loading={running} language={language} />
              </div>
            </div>

            {/* Right: Editor + Results */}
            <div className="space-y-4">
              {/* Language + Run */}
              <div className="flex items-center justify-between">
                <Select value={language} onValueChange={(v) => setLanguage(v as "python" | "sql")}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="sql">SQL</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button onClick={handleRun} disabled={running || !code.trim()} className="gap-2">
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Run Code
                  </Button>
                  {results && (
                    <Button variant="outline" onClick={handleAnalyze} disabled={analyzing} className="gap-2">
                      {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      AI Feedback
                    </Button>
                  )}
                </div>
              </div>

              <CodeEditor language={language} value={code} onChange={setCode} />

              {/* Result Panel + AI Feedback (desktop) */}
              <div className="hidden lg:block space-y-4">
                <ResultPanel results={results} total={totalTests} passed={totalPassed} loading={running} language={language} />
                {aiFeedback && (
                  <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-display font-semibold text-foreground">AI Analysis</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.entries(aiFeedback.scores).map(([key, val]) => (
                        <div key={key} className="text-center p-2 rounded-lg bg-secondary/40">
                          <div className="text-lg font-bold text-primary">{val}/10</div>
                          <div className="text-xs text-muted-foreground capitalize">{key}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{aiFeedback.feedbackText}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
