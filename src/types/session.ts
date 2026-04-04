export type Track = "sql" | "python" | "data-structures";
export type Difficulty = "easy" | "medium" | "hard";

export interface SessionConfig {
  track: Track;
  difficulty: Difficulty;
}

export interface Scores {
  clarity: number;
  structure: number;
  completeness: number;
}

export interface QuestionEntry {
  questionIndex: number;
  questionText: string;
  expectedAnswer?: string;
  transcript: string | null;
  scores: Scores | null;
  feedbackText: string | null;
  audioUrl: string | null;
}

export interface SessionState {
  sessionId: string;
  config: SessionConfig;
  currentQuestionIndex: number;
  questions: QuestionEntry[];
  status: "idle" | "listening" | "processing" | "feedback" | "summary";
}

export const TRACKS: { id: Track; label: string; description: string; icon: string }[] = [
  { id: "sql", label: "SQL", description: "Query writing, joins, window functions, optimization", icon: "🗄️" },
  { id: "python", label: "Python", description: "Algorithms, data structures, OOP, problem solving", icon: "🐍" },
  { id: "data-structures", label: "Data Structures", description: "Arrays, trees, graphs, hash maps, complexity", icon: "🌳" },
];

export const DIFFICULTIES: { id: Difficulty; label: string; color: string }[] = [
  { id: "easy", label: "Easy", color: "text-score-high" },
  { id: "medium", label: "Medium", color: "text-score-mid" },
  { id: "hard", label: "Hard", color: "text-score-low" },
];

// Questions are now stored in the database (questions table).
// Use supabase.from('questions').select('question_text').eq('track', track).eq('difficulty', difficulty).eq('is_active', true)
