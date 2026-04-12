
-- Shadow English Study: session storage
CREATE TABLE public.shadow_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  youtube_url text NOT NULL,
  video_title text NOT NULL DEFAULT '',
  transcript text NOT NULL DEFAULT '',
  roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_role text,
  status text NOT NULL DEFAULT 'extracting',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shadow_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shadow sessions" ON public.shadow_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shadow sessions" ON public.shadow_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shadow sessions" ON public.shadow_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own shadow sessions" ON public.shadow_sessions FOR DELETE USING (auth.uid() = user_id);

-- Shadow results per segment
CREATE TABLE public.shadow_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.shadow_sessions(id) ON DELETE CASCADE,
  segment_index smallint NOT NULL,
  expected_text text NOT NULL,
  user_transcript text,
  scores_pronunciation smallint,
  scores_fluency smallint,
  scores_intonation smallint,
  scores_connected_speech smallint,
  scores_accent_clarity smallint,
  scores_confidence smallint,
  overall_score numeric,
  feedback_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shadow_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shadow results" ON public.shadow_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.shadow_sessions s WHERE s.id = shadow_results.session_id AND s.user_id = auth.uid())
);
CREATE POLICY "Users can insert own shadow results" ON public.shadow_results FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.shadow_sessions s WHERE s.id = shadow_results.session_id AND s.user_id = auth.uid())
);
