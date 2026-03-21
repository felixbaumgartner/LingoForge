import type { Language } from './language';
import type { LessonType } from './lesson';

export interface LessonProgress {
  completed: boolean;
  score?: number;
  completedAt?: string;
}

export interface WordPerformance {
  rank: number;
  word: string;
  translation: string;
  language: Language;
  timesCorrect: number;
  timesIncorrect: number;
  streak: number;
  lastSeen: string;
  lastCorrect: string | null;
  // SRS fields
  easeFactor: number;
  interval: number;       // days until next review
  nextReview: string;     // ISO date
  // Self-rating (from flashcards / speaking)
  rating: 'hard' | 'moderate' | 'easy' | null;
  reviewCount: number;
}

/** @deprecated Use WordPerformance instead */
export interface FlashcardData {
  wordRank: number;
  language: Language;
  rating: 'hard' | 'moderate' | 'easy';
  lastSeen: string;
  nextReview: string;
  reviewCount: number;
}

export type WordPerformanceMap = Record<string, WordPerformance>; // key: "{language}-{rank}"

// key format: "level-lesson" e.g. "1-1", "1-2", ..., "1-5", "2-1"
export type ProgressMap = Record<
  Language,
  Record<LessonType, Record<string, LessonProgress>>
>;
