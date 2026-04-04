

## Plan: Audio Analysis, AI Feedback for Practice, and Admin for Coding Problems

### Answers to Your Questions

**Q1: How does Deepgram work now, and can we save money?**

Currently the flow is: record audio in browser → send blob to `transcribe` edge function → Deepgram STT API transcribes it → return text. Deepgram charges per audio second. The current approach (record first, then send the complete recording) is already the cheapest method — you only pay for the actual audio duration once. The alternative (live/streaming transcription) would cost the same per second but adds complexity. **No changes needed here — you're already using the cost-effective approach.**

**Q2: Sending the problem + solution with the recording for better evaluation.**

Currently the `evaluate` edge function receives only the question text and the user's transcript — it doesn't know the correct answer. We need to add a `solution` (or `expected_answer`) field to the evaluation prompt so the AI can compare the user's answer against the known correct answer.

**Q3: Add analyze & feedback to Practice page.**

The Practice page currently only runs code against test cases. We'll add an "Analyze" button that sends the user's code + problem description + solution to the AI for qualitative feedback (code style, approach, optimization suggestions).

**Q4: How to add more coding problems, test cases, and solutions?**

Currently there's an Admin page at `/admin` for interview questions, but not for coding problems. We need a similar admin UI for the `coding_problems` table.

---

### Implementation

#### 1. Add `solution` column to `coding_problems` table
- Migration: `ALTER TABLE coding_problems ADD COLUMN solution text DEFAULT ''`
- Stores the reference/correct solution for each problem

#### 2. Add `expected_answer` column to `questions` table
- Migration: `ALTER TABLE questions ADD COLUMN expected_answer text DEFAULT ''`
- For interview questions, stores what a good answer should cover
- Update the `evaluate` edge function prompt to include this expected answer for better scoring

#### 3. Update `evaluate` edge function
- Accept optional `expectedAnswer` / `solution` parameter
- Modify the system prompt: "Here is the correct/expected answer: ... Compare the candidate's response against this."
- This makes evaluation much more accurate

#### 4. Add AI feedback to Practice page
- New edge function `supabase/functions/analyze-code/index.ts`:
  - Receives: `code`, `language`, `problem_description`, `solution`, `test_results`
  - Uses Lovable AI (Gemini Flash) to analyze code quality, approach, and suggest improvements
  - Returns: `{ feedbackText, scores: { correctness, style, efficiency } }`
- Update `Practice.tsx`:
  - After running tests, show an "Get AI Feedback" button
  - Display feedback panel below results (reuse styling from Session page's feedback)

#### 5. Coding Problems Admin page
- New page `src/pages/AdminProblems.tsx` (similar to existing `Admin.tsx`)
- CRUD for `coding_problems`: title, description, track, difficulty, boilerplate_python, boilerplate_sql, solution, test_cases (JSON editor), is_active toggle
- Route: `/admin/problems`
- Link from Home page header alongside existing "Questions" link

#### 6. Update Session flow to use expected answers
- When fetching questions from DB, also fetch `expected_answer`
- Pass it to the `evaluate` function for better scoring

### Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/migrations/...` | Add `solution` to `coding_problems`, `expected_answer` to `questions` |
| `supabase/functions/evaluate/index.ts` | Accept + use expected answer in prompt |
| `supabase/functions/analyze-code/index.ts` | New: AI code feedback |
| `src/pages/Practice.tsx` | Add "Get AI Feedback" button + feedback panel |
| `src/pages/AdminProblems.tsx` | New: CRUD for coding problems |
| `src/pages/Session.tsx` | Pass expected answer to evaluate |
| `src/hooks/useQuestions.ts` | Also fetch `expected_answer` |
| `src/App.tsx` | Add `/admin/problems` route |
| `src/pages/Home.tsx` | Add link to problems admin |

