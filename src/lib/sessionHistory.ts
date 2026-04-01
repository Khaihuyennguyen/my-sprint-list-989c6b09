import type { Track, Difficulty, QuestionEntry, Scores } from "@/types/session";

export interface SessionRecord {
  id: string;
  track: Track;
  difficulty: Difficulty;
  date: string; // ISO string
  questions: QuestionEntry[];
  averageScores: Scores;
  overallScore: number;
}

const STORAGE_KEY = "voiceprep_session_history";

export function getSessionHistory(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(
  track: Track,
  difficulty: Difficulty,
  questions: QuestionEntry[]
): SessionRecord {
  const completed = questions.filter((q) => q.scores);
  const len = completed.length || 1;

  const averageScores: Scores = {
    clarity: Math.round(completed.reduce((s, q) => s + (q.scores?.clarity || 0), 0) / len),
    structure: Math.round(completed.reduce((s, q) => s + (q.scores?.structure || 0), 0) / len),
    completeness: Math.round(completed.reduce((s, q) => s + (q.scores?.completeness || 0), 0) / len),
  };

  const overallScore =
    Math.round(((averageScores.clarity + averageScores.structure + averageScores.completeness) / 3) * 10) / 10;

  const record: SessionRecord = {
    id: crypto.randomUUID(),
    track,
    difficulty,
    date: new Date().toISOString(),
    questions,
    averageScores,
    overallScore,
  };

  const history = getSessionHistory();
  history.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
  return record;
}

export function clearSessionHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
