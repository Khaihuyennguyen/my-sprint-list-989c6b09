
-- Allow authenticated users to insert, update, and delete questions (admin operations)
CREATE POLICY "Authenticated users can insert questions"
  ON public.questions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update questions"
  ON public.questions FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete questions"
  ON public.questions FOR DELETE TO authenticated
  USING (true);

-- Also update SELECT policy to show ALL questions (including inactive) for admin view
DROP POLICY IF EXISTS "Authenticated users can view active questions" ON public.questions;
CREATE POLICY "Authenticated users can view all questions"
  ON public.questions FOR SELECT TO authenticated
  USING (true);
