import { useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap, Sparkles, Trophy, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { YouTubeLinkInput } from "@/components/shadow/YouTubeLinkInput";
import { RoleSelector } from "@/components/shadow/RoleSelector";
import { ShadowContinuousPlayer } from "@/components/shadow/ShadowContinuousPlayer";
import { useShadowSession } from "@/hooks/useShadowSession";

export default function Shadow() {
  const navigate = useNavigate();
  const {
    status,
    videoTitle,
    roles,
    dialogue,
    selectedRole,
    segmentResults,
    finalReview,
    processTranscript,
    selectRole,
    finishSession,
    reset,
  } = useShadowSession();

  // === RESULTS SCREEN ===
  if (status === "results") {
    const validResults = segmentResults.filter((r) => r.azureScores);
    const avgScore = validResults.length > 0
      ? Math.round(validResults.reduce((s, r) => s + (r.azureScores.pronScore || 0), 0) / validResults.length)
      : 0;

    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center">
              <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">Roleplay Complete!</h1>
              <p className="text-sm text-muted-foreground line-clamp-1">{videoTitle}</p>
              <p className="text-muted-foreground mt-2">
                Average Score: <span className="text-primary font-bold text-xl">{avgScore}</span>/100
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {validResults.length} of {segmentResults.length} lines scored
              </p>
            </div>

            {finalReview && (
              <>
                <div className="glass-card p-5">
                  <h3 className="text-sm font-display font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Coach's Review
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed">{finalReview.overallSummary}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="glass-card p-4">
                    <h4 className="text-xs font-display font-semibold text-score-high mb-2">Strengths</h4>
                    <ul className="space-y-1.5">
                      {finalReview.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-foreground">• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="glass-card p-4">
                    <h4 className="text-xs font-display font-semibold text-destructive mb-2">To Improve</h4>
                    <ul className="space-y-1.5">
                      {finalReview.weaknesses.map((s, i) => (
                        <li key={i} className="text-xs text-foreground">• {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {finalReview.topProblemWords && finalReview.topProblemWords.length > 0 && (
                  <div className="glass-card p-4">
                    <h4 className="text-xs font-display font-semibold text-foreground mb-2">Words to focus on</h4>
                    <div className="flex flex-wrap gap-2">
                      {finalReview.topProblemWords.map((w, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                          {w.word} ({w.accuracy}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => navigate("/practice-drill", { state: { finalReview, source: "shadow" } })}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2"
                  style={{ boxShadow: "var(--shadow-glow)" }}
                >
                  <Sparkles className="w-4 h-4" />
                  Start Personalized Practice ({finalReview.studyPlan.wordDrills.length} words + {finalReview.studyPlan.sentenceDrills.length} sentences)
                </button>
              </>
            )}

            {/* Per-line breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-display font-semibold text-foreground">Line-by-line</h3>
              {segmentResults.map((r, i) => (
                <div key={i} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-2">"{r.line.text}"</p>
                      {r.recognizedText && r.recognizedText !== r.line.text && (
                        <p className="text-xs text-muted-foreground italic mt-1 line-clamp-1">
                          You said: "{r.recognizedText}"
                        </p>
                      )}
                    </div>
                    {r.azureScores ? (
                      <span className={`text-lg font-bold shrink-0 ${
                        r.azureScores.pronScore >= 70 ? "text-score-high" :
                        r.azureScores.pronScore >= 50 ? "text-score-mid" : "text-score-low"
                      }`}>
                        {r.azureScores.pronScore}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">N/A</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={reset}
              className="w-full py-3.5 rounded-xl border border-primary/30 text-primary font-display font-semibold hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              New Shadow Session
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // === EVALUATING SCREEN ===
  if (status === "evaluating") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center relative z-10">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-display font-bold text-foreground mb-2">Building your study plan...</h2>
          <p className="text-sm text-muted-foreground">Reviewing your full roleplay</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Shadow English Study
          </div>
        </div>

        {status === "idle" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-3">
              Shadow <span className="glow-text text-primary">English</span> Study
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Roleplay real interviews end-to-end. Speak all your lines, then get a personalized study plan.
            </p>
          </motion.div>
        )}

        {(status === "idle" || status === "splitting") && (
          <div>
            <YouTubeLinkInput onSubmit={processTranscript} isLoading={status === "splitting"} />
            {status === "splitting" && (
              <p className="text-xs text-center text-muted-foreground mt-4 animate-pulse">
                Splitting dialogue into roles...
              </p>
            )}
          </div>
        )}

        {status === "role-select" && (
          <RoleSelector roles={roles} videoTitle={videoTitle} onSelect={selectRole} />
        )}

        {status === "playing" && selectedRole && (
          <div>
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">
                Playing as <span className="text-primary font-semibold">{selectedRole}</span>
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1">{videoTitle}</p>
              <button
                onClick={() =>
                  navigate("/teacher", {
                    state: {
                      segments: dialogue
                        .filter((d) => d.role === selectedRole)
                        .map((s, i) => ({ expectedText: s.text, role: s.role, index: i })),
                      videoTitle,
                      selectedRole,
                    },
                  })
                }
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Switch to Teacher Mode (line-by-line)
              </button>
            </div>
            <ShadowContinuousPlayer
              dialogue={dialogue}
              selectedRole={selectedRole}
              onComplete={finishSession}
            />
          </div>
        )}
      </div>
    </div>
  );
}
