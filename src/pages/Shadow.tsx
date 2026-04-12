import { useNavigate } from "react-router-dom";
import { ArrowLeft, Volume2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { YouTubeLinkInput } from "@/components/shadow/YouTubeLinkInput";
import { RoleSelector } from "@/components/shadow/RoleSelector";
import { ShadowPlayer } from "@/components/shadow/ShadowPlayer";
import { ShadowSummary } from "@/components/shadow/ShadowSummary";
import { useShadowSession } from "@/hooks/useShadowSession";

export default function Shadow() {
  const navigate = useNavigate();
  const {
    status,
    videoTitle,
    roles,
    selectedRole,
    userSegments,
    currentSegmentIndex,
    results,
    isProcessing,
    extractTranscript,
    selectRole,
    evaluateSegment,
    nextSegment,
    reset,
    getCurrentContext,
  } = useShadowSession();

  if (status === "results") {
    return (
      <div className="min-h-screen px-4 py-12">
        <ShadowSummary results={results} videoTitle={videoTitle} onRestart={reset} />
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

        {/* Hero for idle state */}
        {status === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-3">
              Shadow <span className="glow-text text-primary">English</span> Study
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Learn English by role-playing real interviews. Practice pronunciation, fluency, and natural speech patterns.
            </p>
          </motion.div>
        )}

        {/* States */}
        {(status === "idle" || status === "extracting" || status === "splitting") && (
          <div>
            <YouTubeLinkInput
              onSubmit={extractTranscript}
              isLoading={status === "extracting" || status === "splitting"}
            />
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

        {status === "playing" && userSegments.length > 0 && (
          <div>
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">
                Playing as <span className="text-primary font-semibold">{selectedRole}</span>
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1">{videoTitle}</p>
            </div>
            <ShadowPlayer
              userSegments={userSegments}
              currentIndex={currentSegmentIndex}
              context={getCurrentContext()}
              result={results[currentSegmentIndex] || null}
              isEvaluating={isProcessing}
              onEvaluate={evaluateSegment}
              onNext={nextSegment}
              totalSegments={userSegments.length}
            />
          </div>
        )}
      </div>
    </div>
  );
}
