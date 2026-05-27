export type CardModality = 'basic' | 'quiz' | 'active' | 'teach_me';

export interface Profile {
  id: string;
  first_name: string | null;
  timezone: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  card_count?: number;
}

export interface CardDraft {
  front: string;
  back: string;
  modality: 'basic' | 'quiz';
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Card {
  id: string;
  user_id: string;
  conversation_id: string | null;
  source_message_id: string | null;
  prompt: string;
  answer: string;
  modality: CardModality;
  metadata: Record<string, unknown> | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardSchedule {
  id: string;
  card_id: string;
  user_id: string;
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
}

export interface ReviewAttempt {
  id: string;
  card_id: string;
  user_id: string;
  rating: 1 | 2 | 3 | 4;
  answer_content: string | null;
  llm_score: number | null;
  answered_at: string;
}
