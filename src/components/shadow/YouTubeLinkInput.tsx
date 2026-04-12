import { useState } from "react";
import { motion } from "framer-motion";
import { Youtube, Loader2 } from "lucide-react";

interface Props {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function YouTubeLinkInput({ onSubmit, isLoading }: Props) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8 max-w-lg mx-auto"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-4">
          <Youtube className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground">Paste a YouTube Interview</h2>
        <p className="text-sm text-muted-foreground mt-2">
          We'll extract the dialogue and let you practice speaking along with one of the roles.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full px-4 py-3 rounded-xl bg-secondary/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          disabled={isLoading}
          required
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Extracting transcript...
            </>
          ) : (
            "Extract & Start"
          )}
        </button>
      </form>

      <div className="mt-6 text-xs text-muted-foreground space-y-1">
        <p>✅ Works best with interview/conversation videos</p>
        <p>✅ Video must have English captions (auto-generated is fine)</p>
        <p>✅ Shorter videos (5-15 min) work best for practice</p>
      </div>
    </motion.div>
  );
}
