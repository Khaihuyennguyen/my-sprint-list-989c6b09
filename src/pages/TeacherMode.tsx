import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  GraduationCap,
  Mic,
  Volume2,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";
import { Waveform } from "@/components/Waveform";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useTeacherSession, type TeacherSegment } from "@/hooks/useTeacherSession";

const SAMPLE_LESSONS = [
  {
    title: "Business Meeting",
    segments: [
      { expectedText: "I'd like to schedule a meeting to discuss the quarterly results.", role: "You", index: 0 },
      { expectedText: "Could you please share your screen so we can review the data together?", role: "You", index: 1 },
      { expectedText: "Let me summarize the key takeaways from today's discussion.", role: "You", index: 2 },
    ],
  },
  {
    title: "Job Interview",
    segments: [
      { expectedText: "Thank you for the opportunity. I'm excited to discuss this role.", role: "You", index: 0 },
      { expectedText: "In my previous position, I led a team of twelve engineers.", role: "You", index: 1 },
      { expectedText: "I believe my experience aligns well with what you're looking for.", role: "You", index: 2 },
    ],
  },
  {
    title: "Daily Conversation",
    segments: [
      { expectedText: "Good morning! How are you doing today?", role: "You", index: 0 },
      { expectedText: "I've been meaning to ask you about the weather this weekend.", role: "You", index: 1 },
      { expectedText: "Would you like to grab a coffee after work?", role: "You", index: 2 },
    ],
  },
  {
    title: "Technology Discussion",
    segments: [
      { expectedText: "Artificial intelligence is transforming the way we work and live.", role: "You", index: 0 },
      { expectedText: "The algorithm processes thousands of data points per second.", role: "You", index: 1 },
      { expectedText: "We need to ensure our infrastructure can handle the increased traffic.", role: "You", index: 2 },
    ],
  },
];

export default function TeacherMode() {
  const navigate = useNavigate();
  const location = useLocation();

  const shadowData = location.state as {
    segments?: TeacherSegment[];
    videoTitle?: string;
    selectedRole?: string;
  } | null;

  const {
    segments,
    currentSegmentIndex,
    status,
    results,
    currentAttempts,
    isProcessing,
    isSpeaking,
    countdown,
    finalReview,
    startSession,
    evaluateAttempt,
    retrySegment,
    nextSegment,
    speakText,
    stopSpeaking,
    introSegment,
    reset,
  } = useTeacherSession();

  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording, duration, error } =
    useAudioRecorder();

  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const waitingForBlob = useRef(false);
  const shadowStarted = useRef(false);
  const introducedFor = useRef<number | null>(null);

  // Auto-start session if coming from Shadow mode
  useEffect(() => {
    if (shadowData?.segments && shadowData.segments.length > 0 && !shadowStarted.current) {
      shadowStarted.current = true;
      startSession(shadowData.segments);
    }
  }, [shadowData, startSession]);

  const currentSegment = segments[currentSegmentIndex];
  const latestAttempt = currentAttempts[currentAttempts.length - 1] || null;

  // When blob is ready after recording → evaluate
  useEffect(() => {
    if (audioBlob && waitingForBlob.current) {
      waitingForBlob.current = false;
      evaluateAttempt(audioBlob);
    }
  }, [audioBlob, evaluateAttempt]);

  const handleStopRecording = useCallback(() => {
    waitingForBlob.current = true;
    stopRecording();
  }, [stopRecording]);

  // Auto-flow: when status becomes "listening" for a new segment, run intro + countdown then auto-start recording
  useEffect(() => {
    if (
      status === "listening" &&
      segments.length > 0 &&
      currentAttempts.length === 0 &&
      introducedFor.current !== currentSegmentIndex &&
      !isRecording
    ) {
      introducedFor.current = currentSegmentIndex;
      introSegment(currentSegmentIndex, async () => {
        resetRecording();
        await startRecording();
      });
    }
  }, [status, segments.length, currentSegmentIndex, currentAttempts.length, isRecording, introSegment, resetRecording, startRecording]);

  const handleSelectLesson = useCallback(
    (index: number) => {
      setSelectedLesson(index);
      introducedFor.current = null;
      startSession(SAMPLE_LESSONS[index].segments);
    },
    [startSession]
  );

  const handleRetry = useCallback(async () => {
    resetRecording();
    retrySegment();
    // For retry, skip the long intro — just countdown then record
    setTimeout(async () => {
      await startRecording();
    }, 600);
  }, [resetRecording, retrySegment, startRecording]);

  const handleNext = useCallback(() => {
    resetRecording();
    nextSegment();
  }, [resetRecording, nextSegment]);

  const handleReset = useCallback(() => {
    resetRecording();
    reset();
    setSelectedLesson(null);
    introducedFor.current = null;
    shadowStarted.current = false;
  }, [resetRecording, reset]);

  // === FINALIZING ===
  if (status === "finalizing") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center relative z-10">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-display font-bold text-foreground mb-2">Analyzing your full session...</h2>
          <p className="text-sm text-muted-foreground">Generating personalized study plan</p>
        </motion.div>
      </div>
    );
  }

  // === COMPLETE SCREEN (with optional final review) ===
  if (status === "complete") {
    const totalAttempts = results.reduce((sum, r) => sum + r.attempts.length, 0);
    const avgScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.bestScore, 0) / results.length)
      : 0;

    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">Lesson Complete!</h1>
              <p className="text-muted-foreground">
                Average Score: <span className="text-primary font-bold text-xl">{avgScore}</span>/100
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {totalAttempts} total attempts across {results.length} sentences
              </p>
            </div>

            {/* Final review */}
            {finalReview && (
              <>
                <div className="glass-card p-5">
                  <h3 className="text-sm font-display font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Teacher's Review
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

                {/* Study plan CTA */}
                <button
                  onClick={() =>
                    navigate("/practice-drill", {
                      state: { finalReview, source: "teacher" },
                    })
                  }
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2"
                  style={{ boxShadow: "var(--shadow-glow)" }}
                >
                  <Sparkles className="w-4 h-4" />
                  Start Personalized Practice ({finalReview.studyPlan.wordDrills.length} words + {finalReview.studyPlan.sentenceDrills.length} sentences)
                </button>
              </>
            )}

            {/* Sentence-by-sentence summary */}
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-foreground flex-1">"{r.segment.expectedText}"</p>
                    <div className="text-right shrink-0">
                      <span className={`text-lg font-bold ${r.bestScore >= 70 ? "text-score-high" : r.bestScore >= 50 ? "text-score-mid" : "text-score-low"}`}>
                        {r.bestScore}
                      </span>
                      <p className="text-[10px] text-muted-foreground">{r.attempts.length} attempt{r.attempts.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3.5 rounded-xl border border-primary/30 text-primary font-display font-semibold hover:bg-primary/10 transition-all"
            >
              Try Another Lesson
            </button>
          </motion.div>
        </div>
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
            Teacher Mode
          </div>
        </div>

        {/* === LESSON SELECT === */}
        {status === "idle" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-3">
                <GraduationCap className="w-8 h-8 inline-block mr-2 text-primary" />
                Teacher <span className="glow-text text-primary">Mode</span>
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your AI teacher will read each sentence to you, count down, and listen automatically. After the lesson you get a personalized study plan.
              </p>
            </div>

            <div className="grid gap-3">
              {SAMPLE_LESSONS.map((lesson, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleSelectLesson(i)}
                  className="glass-card p-5 text-left hover:border-primary/40 transition-all group"
                >
                  <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                    {lesson.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lesson.segments.length} sentences to practice
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">
                    "{lesson.segments[0].expectedText}"
                  </p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* === ACTIVE SESSION === */}
        {status !== "idle" && currentSegment && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="flex items-center gap-2">
              {segments.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < currentSegmentIndex
                      ? "bg-primary"
                      : i === currentSegmentIndex
                      ? "bg-primary/60"
                      : "bg-secondary"
                  }`}
                />
              ))}
            </div>

            {/* Segment info */}
            <div className="text-center">
              {shadowData?.videoTitle && (
                <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                  {shadowData.videoTitle} — as {shadowData.selectedRole}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Sentence {currentSegmentIndex + 1} of {segments.length}
                {currentAttempts.length > 0 && (
                  <span className="ml-2">• Attempt #{currentAttempts.length + (status === "feedback" ? 0 : 1)}</span>
                )}
              </p>
            </div>

            {/* Expected text card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`seg-${currentSegmentIndex}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="glass-card p-6 border-primary/20"
              >
                <div className="flex items-start gap-3">
                  <Mic className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-primary font-medium mb-2">
                      {status === "intro" ? "Teacher is reading..." : "Say this sentence:"}
                    </p>
                    <p className="text-foreground font-medium leading-relaxed text-lg">
                      {currentSegment.expectedText}
                    </p>

                    {latestAttempt?.focusWords && latestAttempt.focusWords.length > 0 && latestAttempt.shouldRetry && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground">Focus on:</span>
                        {latestAttempt.focusWords.map((w, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                            {w}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => speakText(currentSegment.expectedText)}
                  disabled={isSpeaking}
                  className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors ml-8 disabled:opacity-50"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  {isSpeaking ? "Playing..." : "Listen again"}
                </button>
              </motion.div>
            </AnimatePresence>

            {/* === COUNTDOWN OVERLAY === */}
            <AnimatePresence>
              {countdown !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  key={`cd-${countdown}`}
                  className="flex flex-col items-center justify-center py-6"
                >
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Get ready to speak</p>
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-7xl font-display font-bold text-primary"
                    style={{ textShadow: "0 0 40px hsl(var(--primary) / 0.5)" }}
                  >
                    {countdown}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recording controls — hidden during intro/countdown */}
            {status !== "intro" && status !== "countdown" && (
              <div className="flex flex-col items-center gap-4 py-2">
                <Waveform isActive={isRecording} />
                <VoiceButton
                  isRecording={isRecording}
                  isDisabled={isProcessing || status === "evaluating"}
                  onStart={async () => {
                    stopSpeaking();
                    resetRecording();
                    await startRecording();
                  }}
                  onStop={handleStopRecording}
                  duration={duration}
                />
                {isRecording && (
                  <p className="text-xs text-primary animate-pulse">🎙️ Recording... tap to stop when done</p>
                )}
                {error && <p className="text-xs text-destructive">{error}</p>}
                {(isProcessing || status === "evaluating") && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing your pronunciation...
                  </div>
                )}
              </div>
            )}

            {status === "intro" && (
              <p className="text-center text-sm text-muted-foreground animate-pulse">
                <Volume2 className="w-4 h-4 inline mr-1" />
                Teacher is speaking...
              </p>
            )}

            {/* Teacher feedback */}
            {status === "feedback" && latestAttempt && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="glass-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-display font-semibold text-foreground">Azure Speech Analysis</h3>
                    <span className={`text-2xl font-display font-bold ${
                      latestAttempt.azureScores.pronScore >= 70 ? "text-score-high" :
                      latestAttempt.azureScores.pronScore >= 50 ? "text-score-mid" : "text-score-low"
                    }`}>
                      {latestAttempt.azureScores.pronScore}
                      <span className="text-xs text-muted-foreground font-normal">/100</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Accuracy", value: latestAttempt.azureScores.accuracyScore },
                      { label: "Fluency", value: latestAttempt.azureScores.fluencyScore },
                      { label: "Completeness", value: latestAttempt.azureScores.completenessScore },
                      { label: "Prosody", value: latestAttempt.azureScores.prosodyScore },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-secondary/40">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className={`text-sm font-bold ${
                          value >= 70 ? "text-score-high" : value >= 50 ? "text-score-mid" : "text-score-low"
                        }`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-muted-foreground">You said:</p>
                    <p className="text-sm text-foreground italic">"{latestAttempt.recognizedText}"</p>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-primary font-medium mb-1">Teacher says:</p>
                      <p className="text-sm text-foreground leading-relaxed">{latestAttempt.feedback}</p>
                      {latestAttempt.encouragement && (
                        <p className="text-xs text-primary font-semibold mt-2">{latestAttempt.encouragement}</p>
                      )}
                    </div>
                  </div>
                </div>

                {latestAttempt.problemWords.length > 0 && (
                  <div className="glass-card p-4">
                    <h4 className="text-xs font-display font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                      Words to improve
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {latestAttempt.problemWords.map((w, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                          {w.word} ({w.accuracyScore}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {latestAttempt.shouldRetry && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={handleRetry}
                      className="flex-1 py-3.5 rounded-xl border border-primary/30 text-primary font-display font-semibold hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Try Again
                    </motion.button>
                  )}
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleNext}
                    className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    style={{ boxShadow: "var(--shadow-glow)" }}
                  >
                    {currentSegmentIndex < segments.length - 1 ? (
                      <>{latestAttempt.passed ? "Next Sentence" : "Skip"} <ArrowRight className="w-4 h-4" /></>
                    ) : (
                      "Finish & Get Study Plan"
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
