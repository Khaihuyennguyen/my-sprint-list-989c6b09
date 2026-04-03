

## Move Question Bank to Database

### Goal
Store all interview questions in the database so you can add, edit, and delete questions without touching code.

### Database Changes

**New table: `questions`**
- `id` (uuid, PK)
- `track` (text, not null) — "sql", "python", "data-structures"
- `difficulty` (text, not null) — "easy", "medium", "hard"
- `question_text` (text, not null)
- `created_at` (timestamptz, default now())
- `is_active` (boolean, default true) — soft-delete / disable questions

RLS: publicly readable (questions aren't sensitive), only admins would insert/update. For now, allow all authenticated users to SELECT; restrict INSERT/UPDATE/DELETE to service role only (no user-facing write policy).

**Seed migration**: Insert all 108 existing questions from `SAMPLE_QUESTIONS` into the new table.

### Code Changes

1. **`src/pages/Session.tsx`** — Replace the synchronous `SAMPLE_QUESTIONS` lookup with an async fetch from the database on mount. Query: `supabase.from('questions').select('question_text').eq('track', track).eq('difficulty', difficulty).eq('is_active', true)`, then shuffle and pick 3.

2. **`src/types/session.ts`** — Remove `SAMPLE_QUESTIONS` constant (keep `Track`, `Difficulty`, and other types). Add a loading state in Session.tsx while questions load.

3. **Optional admin UI** — Not included in this pass. You can manage questions directly through the database for now. A management UI can be added later.

### Technical Details

- The `is_active` flag lets you disable questions without deleting them
- A unique constraint on `(track, difficulty, question_text)` prevents duplicates
- Fallback: if the fetch fails, show an error toast and navigate back to home

