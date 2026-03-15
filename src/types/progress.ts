import type { Language } from './language';
import type { LessonType } from './lesson';

export interface LessonProgress {
  completed: boolean;
  score?: number;
  completedAt?: string;
}

export interface FlashcardData {
  wordRank: number;
  language: Language;
  rating: 'hard' | 'moderate' | 'easy';
  lastSeen: string;
  nextReview: string;
  reviewCount: number;
}

// key format: "level-lesson" e.g. "1-1", "1-2", ..., "1-5", "2-1"
export type ProgressMap = Record<
  Language,
  Record<LessonType, Record<string, LessonProgress>>
>;
