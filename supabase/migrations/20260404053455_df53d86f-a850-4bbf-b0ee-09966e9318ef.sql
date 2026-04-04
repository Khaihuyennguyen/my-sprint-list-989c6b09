
ALTER TABLE public.coding_problems ADD COLUMN solution text DEFAULT '';
ALTER TABLE public.questions ADD COLUMN expected_answer text DEFAULT '';

CREATE POLICY "Authenticated users can insert coding problems"
ON public.coding_problems FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update coding problems"
ON public.coding_problems FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete coding problems"
ON public.coding_problems FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view active coding problems" ON public.coding_problems;
CREATE POLICY "Authenticated users can view coding problems"
ON public.coding_problems FOR SELECT TO authenticated USING (true);
