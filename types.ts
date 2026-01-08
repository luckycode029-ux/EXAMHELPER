
export interface RepeatedQuestion {
  question: string;
  count: number;
  years: string[];
}

export interface RevisionNote {
  topic: string;
  content: string[];
}

export interface AnalysisResult {
  repeated_questions: RepeatedQuestion[];
  important_questions: string[];
  top_15: string[];
  notes: RevisionNote[];
}

export interface FileData {
  name: string;
  type: string;
  data: string; // Base64
}

export type AppStatus = 'IDLE' | 'ANALYZING' | 'COMPLETED' | 'ERROR';
