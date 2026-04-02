import { supabase } from "@/integrations/supabase/client";
import type { Track, Difficulty, QuestionEntry, Scores } from "@/types/session";

export interface SessionRecord {
  id: string;
  track: Track;
  difficulty: Difficulty;
  date: string;
  questions: QuestionEntry[];
  averageScores: Scores;
  overallScore: number;
}

export async function getSessionHistory(): Promise<SessionRecord[]> {
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !sessions) return [];

  const sessionIds = sessions.map((s: any) => s.id);
  const { data: questions } = await supabase
    .from("session_questions")
    .select("*")
    .in("session_id", sessionIds)
    .order("question_index", { ascending: true });

  const questionsBySession = new Map<string, QuestionEntry[]>();
  (questions || []).forEach((q: any) => {
    const list = questionsBySession.get(q.session_id) || [];
    list.push({
      questionIndex: q.question_index,
      questionText: q.question_text,
      transcript: q.transcript,
      scores: q.scores_clarity != null
        ? { clarity: q.scores_clarity, structure: q.scores_structure, completeness: q.scores_completeness }
        : null,
      feedbackText: q.feedback_text,
      audioUrl: null,
    });
    questionsBySession.set(q.session_id, list);
  });

  return sessions.map((s: any) => ({
    id: s.id,
    track: s.track as Track,
    difficulty: s.difficulty as Difficulty,
    date: s.created_at,
    questions: questionsBySession.get(s.id) || [],
    averageScores: {
      clarity: s.avg_clarity,
      structure: s.avg_structure,
      completeness: s.avg_completeness,
    },
    overallScore: Number(s.overall_score),
  }));
}

export async function saveSession(
  track: Track,
  difficulty: Difficulty,
  questions: QuestionEntry[]
): Promise<SessionRecord | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const completed = questions.filter((q) => q.scores);
  const len = completed.length || 1;

  const averageScores: Scores = {
    clarity: Math.round(completed.reduce((s, q) => s + (q.scores?.clarity || 0), 0) / len),
    structure: Math.round(completed.reduce((s, q) => s + (q.scores?.structure || 0), 0) / len),
    completeness: Math.round(completed.reduce((s, q) => s + (q.scores?.completeness || 0), 0) / len),
  };

  const overallScore =
    Math.round(((averageScores.clarity + averageScores.structure + averageScores.completeness) / 3) * 10) / 10;

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      track,
      difficulty,
      avg_clarity: averageScores.clarity,
      avg_structure: averageScores.structure,
      avg_completeness: averageScores.completeness,
      overall_score: overallScore,
    })
    .select()
    .single();

  if (error || !session) {
    console.error("Failed to save session:", error);
    return null;
  }

  const questionRows = questions.map((q, i) => ({
    session_id: session.id,
    question_index: i,
    question_text: q.questionText,
    transcript: q.transcript,
    scores_clarity: q.scores?.clarity ?? null,
    scores_structure: q.scores?.structure ?? null,
    scores_completeness: q.scores?.completeness ?? null,
    feedback_text: q.feedbackText,
  }));

  await supabase.from("session_questions").insert(questionRows);

  return {
    id: session.id,
    track,
    difficulty,
    date: session.created_at,
    questions,
    averageScores,
    overallScore,
  };
}

export async function clearSessionHistory(): Promise<void> {
  // Delete all sessions for the current user (cascade deletes questions)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("sessions").delete().eq("user_id", user.id);
}
