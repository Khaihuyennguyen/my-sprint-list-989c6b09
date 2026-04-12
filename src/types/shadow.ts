export interface ShadowRole {
  name: string;
  lineCount: number;
  wordCount: number;
}

export interface DialogueLine {
  role: string;
  text: string;
  index: number;
}

export interface PronunciationScores {
  pronunciation: number;
  fluency: number;
  intonation: number;
  connectedSpeech: number;
  accentClarity: number;
  confidence: number;
}

export interface WordIssue {
  word: string;
  issue: string;
  tip: string;
}

export interface SegmentResult {
  segmentIndex: number;
  expectedText: string;
  userTranscript: string | null;
  scores: PronunciationScores | null;
  overallScore: number | null;
  feedback: string | null;
  wordIssues: WordIssue[];
}

export interface ShadowSession {
  id: string;
  youtubeUrl: string;
  videoTitle: string;
  transcript: string;
  roles: ShadowRole[];
  dialogue: DialogueLine[];
  selectedRole: string | null;
  status: "extracting" | "splitting" | "role-select" | "playing" | "evaluating" | "results";
}
