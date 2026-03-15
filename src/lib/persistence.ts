import type { Language } from '../types/language';
import type { LessonType } from '../types/lesson';
import type { ProgressMap, LessonProgress, FlashcardData } from '../types/progress';

const PROGRESS_KEY = 'lingoforge_progress';
const FLASHCARD_KEY = 'lingoforge_flashcards';
const LESSON_CACHE_KEY = 'lingoforge_lessons';

export const TOTAL_LEVELS = 16;
export const LESSONS_PER_LEVEL = 5;

function progressKey(level: number, lesson: number): string {
  return `${level}-${lesson}`;
}

function createEmptyProgress(): ProgressMap {
  const types: LessonType[] = ['reading', 'writing', 'speaking'];
  const langs: Language[] = ['spanish', 'french', 'dutch'];
  const map = {} as ProgressMap;
  for (const lang of langs) {
    map[lang] = {} as Record<LessonType, Record<string, LessonProgress>>;
    for (const type of types) {
      map[lang][type] = {};
    }
  }
  return map;
}

export function loadProgress(): ProgressMap {
  const raw = localStorage.getItem(PROGRESS_KEY);
  if (!raw) return createEmptyProgress();
  try {
    return JSON.parse(raw);
  } catch {
    return createEmptyProgress();
  }
}

export function saveProgress(progress: ProgressMap): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function isLevelComplete(
  progress: ProgressMap,
  language: Language,
  type: LessonType,
  level: number
): boolean {
  const typeProgress = progress[language]?.[type] ?? {};
  for (let l = 1; l <= LESSONS_PER_LEVEL; l++) {
    if (!typeProgress[progressKey(level, l)]?.completed) return false;
  }
  return true;
}

export function getCompletedLessonsInLevel(
  progress: ProgressMap,
  language: Language,
  type: LessonType,
  level: number
): number {
  const typeProgress = progress[language]?.[type] ?? {};
  let count = 0;
  for (let l = 1; l <= LESSONS_PER_LEVEL; l++) {
    if (typeProgress[progressKey(level, l)]?.completed) count++;
  }
  return count;
}

export function isLessonUnlocked(
  progress: ProgressMap,
  language: Language,
  type: LessonType,
  level: number,
  lesson: number
): boolean {
  if (!isSectionUnlocked(progress, language, type)) return false;
  // First lesson of first level is always open
  if (level === 1 && lesson === 1) return true;
  // First lesson of a level: previous level must be complete
  if (lesson === 1) {
    return isLevelComplete(progress, language, type, level - 1);
  }
  // Otherwise: previous lesson in same level must be complete
  const prev = progress[language]?.[type]?.[progressKey(level, lesson - 1)];
  return prev?.completed === true;
}

export function isSectionUnlocked(
  progress: ProgressMap,
  language: Language,
  type: LessonType
): boolean {
  if (type === 'reading') return true;
  if (type === 'writing') {
    return getCompletedLevelCount(progress, language, 'reading') >= TOTAL_LEVELS;
  }
  return getCompletedLevelCount(progress, language, 'writing') >= TOTAL_LEVELS;
}

export function getCompletedLevelCount(
  progress: ProgressMap,
  language: Language,
  type: LessonType
): number {
  let count = 0;
  for (let lvl = 1; lvl <= TOTAL_LEVELS; lvl++) {
    if (isLevelComplete(progress, language, type, lvl)) count++;
  }
  return count;
}

export function getTotalCompletedLevels(
  progress: ProgressMap,
  language: Language
): number {
  return (
    getCompletedLevelCount(progress, language, 'reading') +
    getCompletedLevelCount(progress, language, 'writing') +
    getCompletedLevelCount(progress, language, 'speaking')
  );
}

// Lesson cache — now includes lesson number
export function getCachedLesson(language: Language, type: LessonType, level: number, lesson: number): unknown | null {
  const raw = localStorage.getItem(LESSON_CACHE_KEY);
  if (!raw) return null;
  try {
    const cache = JSON.parse(raw);
    return cache[`${language}-${type}-${level}-${lesson}`] ?? null;
  } catch {
    return null;
  }
}

export function setCachedLesson(language: Language, type: LessonType, level: number, lesson: number, data: unknown): void {
  const raw = localStorage.getItem(LESSON_CACHE_KEY);
  let cache: Record<string, unknown> = {};
  if (raw) {
    try { cache = JSON.parse(raw); } catch { /* ignore */ }
  }
  cache[`${language}-${type}-${level}-${lesson}`] = data;
  localStorage.setItem(LESSON_CACHE_KEY, JSON.stringify(cache));
}

// Flashcard data
export function loadFlashcardData(): FlashcardData[] {
  const raw = localStorage.getItem(FLASHCARD_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveFlashcardData(data: FlashcardData[]): void {
  localStorage.setItem(FLASHCARD_KEY, JSON.stringify(data));
}
