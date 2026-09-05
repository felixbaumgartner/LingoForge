import type { Language } from '../types/language';
import type { LessonType } from '../types/lesson';
import type { ProgressMap, WordPerformance, WordPerformanceMap } from '../types/progress';
import { isLessonUnlocked, LESSONS_PER_LEVEL, TOTAL_LEVELS } from './persistence';

export function getNextLesson(progress: ProgressMap, language: Language, type: LessonType) {
  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    for (let lesson = 1; lesson <= LESSONS_PER_LEVEL; lesson++) {
      if (
        !progress[language]?.[type]?.[`${level}-${lesson}`]?.completed &&
        isLessonUnlocked(progress, language, type, level, lesson)
      )
        return { level, lesson };
    }
  }
  return null;
}

export function getLessonCount(progress: ProgressMap, language: Language, type: LessonType): number {
  let count = 0;
  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    for (let lesson = 1; lesson <= LESSONS_PER_LEVEL; lesson++) {
      if (progress[language]?.[type]?.[`${level}-${lesson}`]?.completed) count++;
    }
  }
  return count;
}

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getTodayPracticeCount(map: WordPerformanceMap, language: Language, now = new Date()): number {
  const today = localDayKey(now);
  return Object.values(map).filter(
    (word) =>
      word.language === language && word.reviewCount > 0 && localDayKey(new Date(word.lastSeen)) === today,
  ).length;
}

export type WordStatus = 'new' | 'learning' | 'mastered';
export function getWordStatus(word?: WordPerformance): WordStatus {
  if (!word || word.timesCorrect + word.timesIncorrect === 0) return 'new';
  if (
    word.rating === 'easy' ||
    (word.timesCorrect / (word.timesCorrect + word.timesIncorrect) >= 0.8 && word.streak >= 2)
  )
    return 'mastered';
  return 'learning';
}
