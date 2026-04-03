import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Track, Difficulty } from "@/types/session";

export function useQuestions(track: Track, difficulty: Difficulty, count: number) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("questions")
        .select("question_text")
        .eq("track", track)
        .eq("difficulty", difficulty)
        .eq("is_active", true);

      if (cancelled) return;

      if (fetchError || !data || data.length === 0) {
        setError(fetchError?.message || "No questions found for this track and difficulty.");
        setLoading(false);
        return;
      }

      const shuffled = data
        .map((q) => q.question_text)
        .sort(() => Math.random() - 0.5)
        .slice(0, count);

      setQuestions(shuffled);
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [track, difficulty, count]);

  return { questions, loading, error };
}
