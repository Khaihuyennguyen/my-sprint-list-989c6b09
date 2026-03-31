import { motion } from "framer-motion";

interface TranscriptPanelProps {
  transcript: string | null;
  feedbackText: string | null;
  isProcessing: boolean;
}

export function TranscriptPanel({ transcript, feedbackText, isProcessing }: TranscriptPanelProps) {
  if (isProcessing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-muted-foreground">Analyzing your answer...</span>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-secondary rounded-full w-full animate-pulse" />
          <div className="h-3 bg-secondary rounded-full w-3/4 animate-pulse" />
          <div className="h-3 bg-secondary rounded-full w-5/6 animate-pulse" />
        </div>
      </motion.div>
    );
  }

  if (!transcript && !feedbackText) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {transcript && (
        <div className="glass-card p-5 space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Your Answer
          </h4>
          <p className="text-sm text-secondary-foreground leading-relaxed">{transcript}</p>
        </div>
      )}

      {feedbackText && (
        <div className="glass-card p-5 space-y-2 border-l-2 border-l-primary">
          <h4 className="text-xs font-medium uppercase tracking-wider text-primary">
            Coach Feedback
          </h4>
          <p className="text-sm text-secondary-foreground leading-relaxed">{feedbackText}</p>
        </div>
      )}
    </motion.div>
  );
}
