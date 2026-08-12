// Hand-written types matching db/migrations/001_init_schema.sql.
// Once the project is deployed, regenerate with:
//   npx supabase gen types typescript --project-id <id> > types/database.ts
// and merge in the domain types below.

export type UserRole = 'student' | 'admin' | 'super_admin';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ExamType = 'jamb' | 'waec' | 'utme' | 'general';
export type AttemptMode = 'practice' | 'mock' | 'cbt' | 'utme_challenge' | 'millionaire';
export type AttemptStatus = 'in_progress' | 'submitted' | 'auto_submitted' | 'abandoned';
export type ImportStatus = 'previewing' | 'committed' | 'discarded';

export interface Profile {
  id: string;
  full_name: string;
  display_name: string | null;
  phone: string | null;
  role: UserRole;
  school: string | null;
  exam_target: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  exam_types: string[];
  icon: string | null;
  is_active: boolean;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
}

export interface Passage {
  id: string;
  subject_id: string;
  title: string | null;
  body: string;
  passage_type: 'comprehension' | 'cloze';
}

// Full record — server-side only, includes the answer key.
export interface Question {
  id: string;
  subject_id: string;
  topic_id: string | null;
  passage_id: string | null;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string | null;
  difficulty: Difficulty;
  exam_type: ExamType;
  year: number | null;
  modes: string[];
  millionaire_tier: number | null;
  is_active: boolean;
}

// What the client receives before submission — no answer key.
export type QuestionPublic = Omit<Question, 'correct_answer' | 'explanation' | 'is_active'>;

export interface ExamAttempt {
  id: string;
  student_id: string;
  mode: AttemptMode;
  subject_ids: string[];
  config: Record<string, unknown>;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  duration_seconds: number | null;
  time_used_seconds: number | null;
  total_questions: number | null;
  correct_count: number | null;
  incorrect_count: number | null;
  unanswered_count: number | null;
  score: number | null;
  millionaire_prize_tier: number | null;
  millionaire_lifelines_used: string[];
}

export interface AttemptQuestion {
  id: string;
  attempt_id: string;
  question_id: string;
  position: number;
  selected_answer: 'A' | 'B' | 'C' | 'D' | null;
  is_correct: boolean | null;
  answered_at: string | null;
  time_spent_seconds: number | null;
}

export interface LeaderboardEntry {
  id: string;
  attempt_id: string;
  student_id: string;
  category: string;
  score: number;
  time_used_seconds: number | null;
  created_at: string;
}

export interface CommunitySettings {
  whatsapp_group_url: string | null;
  whatsapp_channel_url: string | null;
  telegram_url: string | null;
}

// ---- Bulk importer domain types ----
export interface ParsedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  subject: string;
  topic?: string;
  difficulty?: Difficulty;
  exam_type?: ExamType;
  year?: number;
  passage_text?: string; // if present, question is linked/created against a passage
}

export interface ParseError {
  block_index: number;
  raw_text: string;
  reason: string;
}

export interface ImportPreview {
  total_detected: number;
  valid: ParsedQuestion[];
  invalid: ParseError[];
  duplicates: { question: ParsedQuestion; existing_question_id: string }[];
}
