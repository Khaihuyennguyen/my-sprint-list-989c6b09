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

export const SAMPLE_QUESTIONS: Record<Track, Record<Difficulty, string[]>> = {
  sql: {
    easy: [
      "Write a query to find all employees who joined in the last 30 days.",
      "How would you find duplicate records in a table?",
      "Explain the difference between WHERE and HAVING clauses.",
    ],
    medium: [
      "Write a query using window functions to rank employees by salary within each department.",
      "How would you find the second highest salary in each department?",
      "Explain the difference between INNER JOIN, LEFT JOIN, and CROSS JOIN with examples.",
    ],
    hard: [
      "Design a query to find gaps in a sequence of dates for subscription data.",
      "How would you optimize a slow query that joins 5 tables with millions of rows?",
      "Write a recursive CTE to traverse an organizational hierarchy.",
    ],
  },
  python: {
    easy: [
      "How would you reverse a string without using built-in reverse functions?",
      "Write a function to check if a number is a palindrome.",
      "Explain the difference between a list and a tuple in Python.",
    ],
    medium: [
      "Implement a function to find the longest common subsequence of two strings.",
      "How would you implement a LRU cache from scratch?",
      "Explain Python decorators and write one that measures function execution time.",
    ],
    hard: [
      "Design a thread-safe producer-consumer queue with backpressure.",
      "Implement a trie data structure with autocomplete functionality.",
      "How would you design a rate limiter using the token bucket algorithm?",
    ],
  },
  "data-structures": {
    easy: [
      "What is the time complexity of searching in a hash map vs. a sorted array?",
      "Implement a stack using two queues.",
      "Explain when you would use a linked list over an array.",
    ],
    medium: [
      "Implement a binary search tree with insert, delete, and search operations.",
      "How would you detect a cycle in a directed graph?",
      "Explain the difference between BFS and DFS and when to use each.",
    ],
    hard: [
      "Implement a self-balancing AVL tree with rotations.",
      "Design an efficient data structure for range minimum queries.",
      "How would you implement a concurrent skip list?",
    ],
  },
};
