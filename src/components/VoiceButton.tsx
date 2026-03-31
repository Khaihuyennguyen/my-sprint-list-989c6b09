import { motion } from "framer-motion";
import { Mic, Square } from "lucide-react";

interface VoiceButtonProps {
  isRecording: boolean;
  isDisabled?: boolean;
  onStart: () => void;
  onStop: () => void;
  duration?: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceButton({ isRecording, isDisabled, onStart, onStop, duration = 0 }: VoiceButtonProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={isRecording ? onStop : onStart}
        disabled={isDisabled}
        className={`
          relative w-24 h-24 rounded-full flex items-center justify-center transition-all
          ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
          ${isRecording
            ? "bg-destructive voice-ring voice-ring-active"
            : "bg-primary hover:brightness-110"
          }
        `}
      >
        {isRecording ? (
          <Square className="w-8 h-8 text-destructive-foreground" />
        ) : (
          <Mic className="w-8 h-8 text-primary-foreground" />
        )}

        {/* Outer glow rings */}
        {isRecording && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-destructive"
              animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border border-destructive"
              animate={{ scale: [1, 1.7], opacity: [0.3, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
            />
          </>
        )}
      </motion.button>

      <span className="text-sm text-muted-foreground font-body">
        {isRecording ? formatDuration(duration) : "Tap to speak"}
      </span>
    </div>
  );
}
