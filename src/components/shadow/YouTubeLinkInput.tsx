import { useState } from "react";
import { motion } from "framer-motion";
import { Youtube, Loader2, ClipboardPaste, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onSubmit: (data: { videoTitle: string; transcript: string }) => void;
  isLoading: boolean;
}

export function YouTubeLinkInput({ onSubmit, isLoading }: Props) {
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<"url" | "paste">("url");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoId, setVideoId] = useState("");
  const [transcript, setTranscript] = useState("");
  const [validating, setValidating] = useState(false);

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-youtube-transcript", {
        body: { youtubeUrl: url.trim() },
      });

      if (error) throw new Error(error.message);

      setVideoTitle(data.videoTitle || "Untitled Video");
      setVideoId(data.videoId || "");

      if (data.transcript && !data.needsManualTranscript) {
        onSubmit({ videoTitle: data.videoTitle, transcript: data.transcript });
      } else {
        setStep("paste");
      }
    } catch (err) {
      console.error(err);
      setVideoTitle("YouTube Video");
      setStep("paste");
    } finally {
      setValidating(false);
    }
  };

  const handleTranscriptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transcript.trim().length < 50) return;
    onSubmit({ videoTitle, transcript: transcript.trim() });
  };

  if (step === "paste") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 max-w-lg mx-auto"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <ClipboardPaste className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">Paste the Transcript</h2>
          <p className="text-sm text-muted-foreground mt-2">
            <span className="font-semibold text-foreground">{videoTitle}</span>
          </p>
        </div>

        <div className="glass-card p-3 mb-4 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground">How to get the transcript:</p>
          <p>1. Open the YouTube video</p>
          <p>2. Click the <strong>three dots (⋯)</strong> below the video</p>
          <p>3. Click <strong>"Show transcript"</strong></p>
          <p>4. Select all text (Ctrl+A) and copy (Ctrl+C)</p>
          <p>5. Paste it below</p>
          {videoId && (
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 mt-1"
            >
              <ExternalLink className="w-3 h-3" />
              Open video in new tab
            </a>
          )}
        </div>

        <form onSubmit={handleTranscriptSubmit} className="space-y-4">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste the full transcript here... (timestamps will be automatically removed)"
            className="w-full px-4 py-3 rounded-xl bg-secondary/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm min-h-[200px] resize-y"
            disabled={isLoading}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep("url"); setTranscript(""); }}
              className="px-4 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading || transcript.trim().length < 50}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Split Dialogue & Start"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    );
  }

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
          We'll help you practice speaking by role-playing the conversation.
        </p>
      </div>

      <form onSubmit={handleUrlSubmit} className="space-y-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full px-4 py-3 rounded-xl bg-secondary/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          disabled={validating}
          required
        />
        <button
          type="submit"
          disabled={validating || !url.trim()}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          {validating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Extracting transcript...
            </>
          ) : (
            "Extract & Start →"
          )}
        </button>
      </form>

      <div className="mt-6 text-xs text-muted-foreground space-y-1">
        <p>✅ Works best with interview/conversation videos</p>
        <p>✅ You'll paste the transcript from the video</p>
        <p>✅ Shorter videos (5-15 min) work best for practice</p>
      </div>
    </motion.div>
  );
}
