import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrackSelector } from "@/components/TrackSelector";
import { Mic, BarChart3, BookOpen, History, LogOut, Settings, Code2, Database, Languages } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Track, Difficulty } from "@/types/session";

export default function Home() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);

  const handleStart = () => {
    if (selectedTrack && selectedDifficulty) {
      navigate(`/session?track=${selectedTrack}&difficulty=${selectedDifficulty}`);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "var(--gradient-glow)" }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 sm:py-20">
        <div className="flex justify-end gap-3 mb-4">
          <button
            onClick={() => navigate("/shadow")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Languages className="w-4 h-4" />
            Shadow
          </button>
          <button
            onClick={() => navigate("/practice")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Code2 className="w-4 h-4" />
            Practice
          </button>
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-4 h-4" />
            Questions
          </button>
          <button
            onClick={() => navigate("/admin/problems")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Database className="w-4 h-4" />
            Problems
          </button>
          <button
            onClick={() => navigate("/history")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 mb-16"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium"
          >
            <Mic className="w-3.5 h-3.5" />
            Voice-first interview prep
          </motion.div>

          <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground leading-tight">
            Practice interviews
            <br />
            <span className="glow-text text-primary">with AI coaching</span>
          </h1>

          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Answer technical questions verbally. Get instant feedback on clarity,
            structure, and completeness.
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3 mb-14"
        >
          {[
            { icon: Mic, label: "Voice answers" },
            { icon: BarChart3, label: "Scored feedback" },
            { icon: BookOpen, label: "3-question sessions" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/60 text-sm text-secondary-foreground"
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
              {label}
            </div>
          ))}
        </motion.div>

        {/* Track selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <TrackSelector
            selectedTrack={selectedTrack}
            selectedDifficulty={selectedDifficulty}
            onSelectTrack={setSelectedTrack}
            onSelectDifficulty={setSelectedDifficulty}
            onStart={handleStart}
          />
        </motion.div>
      </div>
    </div>
  );
}
