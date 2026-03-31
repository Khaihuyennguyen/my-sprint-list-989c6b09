import { motion } from "framer-motion";
import { TRACKS, DIFFICULTIES, type Track, type Difficulty } from "@/types/session";

interface TrackSelectorProps {
  selectedTrack: Track | null;
  selectedDifficulty: Difficulty | null;
  onSelectTrack: (track: Track) => void;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onStart: () => void;
}

export function TrackSelector({
  selectedTrack,
  selectedDifficulty,
  onSelectTrack,
  onSelectDifficulty,
  onStart,
}: TrackSelectorProps) {
  const canStart = selectedTrack && selectedDifficulty;

  return (
    <div className="space-y-10">
      {/* Tracks */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Choose your track
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TRACKS.map((track) => (
            <motion.button
              key={track.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectTrack(track.id)}
              className={`glass-card p-5 text-left transition-all cursor-pointer ${
                selectedTrack === track.id
                  ? "border-primary ring-1 ring-primary/30"
                  : "hover:border-muted-foreground/30"
              }`}
            >
              <div className="text-2xl mb-2">{track.icon}</div>
              <h4 className="font-display font-semibold text-foreground">{track.label}</h4>
              <p className="text-xs text-muted-foreground mt-1">{track.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Difficulty level
        </h3>
        <div className="flex gap-3">
          {DIFFICULTIES.map((diff) => (
            <button
              key={diff.id}
              onClick={() => onSelectDifficulty(diff.id)}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all border ${
                selectedDifficulty === diff.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-secondary-foreground hover:border-muted-foreground/40"
              }`}
            >
              {diff.label}
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <motion.button
        whileHover={canStart ? { scale: 1.02 } : {}}
        whileTap={canStart ? { scale: 0.98 } : {}}
        onClick={onStart}
        disabled={!canStart}
        className={`w-full py-4 rounded-xl font-display font-semibold text-lg transition-all ${
          canStart
            ? "bg-primary text-primary-foreground hover:brightness-110 cursor-pointer"
            : "bg-secondary text-muted-foreground cursor-not-allowed"
        }`}
        style={canStart ? { boxShadow: "var(--shadow-glow)" } : {}}
      >
        Start Interview Session
      </motion.button>
    </div>
  );
}
