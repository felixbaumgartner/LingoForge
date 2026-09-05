import type { Language } from '../types/language';
import type { LessonType } from '../types/lesson';
import type { ProgressMap, LessonProgress, FlashcardData, WordPerformance, WordPerformanceMap } from '../types/progress';

const PROGRESS_KEY = 'lingoforge_progress';
const FLASHCARD_KEY = 'lingoforge_flashcards';
const WORD_PERF_KEY = 'lingoforge_word_performance';
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
  if (!Number.isInteger(level) || level < 1 || level > TOTAL_LEVELS ||
      !Number.isInteger(lesson) || lesson < 1 || lesson > LESSONS_PER_LEVEL) return false;
  if (!isSectionUnlocked(progress, language, type)) return false;
  if (progress[language]?.[type]?.[progressKey(level, lesson)]?.completed) return true;
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
  _progress: ProgressMap,
  _language: Language,
  type: LessonType
): boolean {
  // Skills develop together. Each track keeps its own sequential progression.
  return ['reading', 'writing', 'speaking'].includes(type);
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

// Flashcard data (legacy — kept for migration)
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

// --- Word Performance ---

export function wordPerfKey(language: Language, rank: number): string {
  return `${language}-${rank}`;
}

export function loadWordPerformance(): WordPerformanceMap {
  const raw = localStorage.getItem(WORD_PERF_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveWordPerformance(data: WordPerformanceMap): void {
  try {
    localStorage.setItem(WORD_PERF_KEY, JSON.stringify(data));
  } catch {
    // localStorage full — silently fail, data is still in memory via Zustand
  }
}

export function createWordPerformance(
  rank: number,
  word: string,
  translation: string,
  language: Language
): WordPerformance {
  const now = new Date().toISOString();
  return {
    rank,
    word,
    translation,
    language,
    timesCorrect: 0,
    timesIncorrect: 0,
    streak: 0,
    lastSeen: now,
    lastCorrect: null,
    easeFactor: 2.5,
    interval: 0,
    nextReview: now,
    rating: null,
    reviewCount: 0,
  };
}

export function recordWordResult(
  map: WordPerformanceMap,
  language: Language,
  rank: number,
  word: string,
  translation: string,
  correct: boolean
): WordPerformanceMap {
  const key = wordPerfKey(language, rank);
  const now = new Date().toISOString();
  const existing = map[key] ?? createWordPerformance(rank, word, translation, language);

  const updated: WordPerformance = {
    ...existing,
    lastSeen: now,
    reviewCount: existing.reviewCount + 1,
  };

  if (correct) {
    updated.timesCorrect = existing.timesCorrect + 1;
    updated.streak = existing.streak + 1;
    updated.lastCorrect = now;
  } else {
    updated.timesIncorrect = existing.timesIncorrect + 1;
    updated.streak = 0;
    // If the user previously self-rated this word as "easy" but now got it wrong,
    // clear the rating so it can re-enter the weak list.
    if (existing.rating === 'easy') updated.rating = null;
  }

  // Basic SRS scheduling (SM-2 ready fields populated)
  const quality = correct ? (existing.streak >= 2 ? 5 : 4) : (existing.streak === 0 ? 1 : 2);
  updated.easeFactor = Math.max(1.3, existing.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  if (correct) {
    const previousInterval = Number.isFinite(existing.interval) ? Math.max(0, existing.interval) : 0;
    const due = new Date(existing.nextReview).getTime() <= new Date(now).getTime();
    if (previousInterval === 0) updated.interval = 1;
    else if (!due) updated.interval = previousInterval;
    else if (previousInterval === 1) updated.interval = 3;
    else updated.interval = previousInterval * Math.min(3, updated.easeFactor);
    updated.interval = Math.min(180, Math.max(1, Math.round(updated.interval)));
  } else {
    updated.interval = 1;
  }

  updated.nextReview = new Date(Date.now() + updated.interval * 86400000).toISOString();

  return { ...map, [key]: updated };
}

/** Preview the same adaptive intervals used when a self-rating is saved. */
export function getRatingIntervals(
  existing?: WordPerformance,
  now = Date.now(),
): Record<'hard' | 'moderate' | 'easy', number> {
  if (!existing || existing.reviewCount <= 0) return { hard: 1, moderate: 3, easy: 7 };
  const interval = Number.isFinite(existing.interval) ? Math.max(0, existing.interval) : 0;
  const ease = Number.isFinite(existing.easeFactor) ? Math.min(3, Math.max(1.3, existing.easeFactor)) : 2.5;
  const due = new Date(existing.nextReview).getTime() <= now;
  const bounded = (days: number, minimum: number) => Math.min(180, Math.max(minimum, Math.round(days)));
  return {
    hard: 1,
    moderate: bounded(due ? interval * 1.5 : interval, 3),
    easy: bounded(due ? interval * ease : interval, 7),
  };
}

export function recordWordRating(
  map: WordPerformanceMap,
  language: Language,
  rank: number,
  word: string,
  translation: string,
  rating: 'hard' | 'moderate' | 'easy'
): WordPerformanceMap {
  const key = wordPerfKey(language, rank);
  const now = Date.now();
  const intervals = getRatingIntervals(map[key], now);
  const correct = rating !== 'hard';
  const result = recordWordResult(map, language, rank, word, translation, correct);
  result[key] = { ...result[key], rating };

  // Successful scheduled reviews grow; extra early practice does not compound intervals.
  result[key].interval = intervals[rating];
  result[key].nextReview = new Date(now + intervals[rating] * 86400000).toISOString();

  return result;
}

export function getWeakWords(map: WordPerformanceMap, language: Language, limit = 10): WordPerformance[] {
  return Object.values(map)
    .filter((wp) => {
      if (wp.language !== language) return false;
      // User explicitly graduated this word from the weak list by rating it "Easy".
      if (wp.rating === 'easy') return false;
      const total = wp.timesCorrect + wp.timesIncorrect;
      if (total < 2) return false;
      const acc = wp.timesCorrect / total;
      // Only include words that aren't mastered (< 80% accuracy or streak < 2)
      return acc < 0.8 || wp.streak < 2;
    })
    .sort((a, b) => {
      const accA = a.timesCorrect / (a.timesCorrect + a.timesIncorrect);
      const accB = b.timesCorrect / (b.timesCorrect + b.timesIncorrect);
      return accA - accB;
    })
    .slice(0, limit);
}

export function getWordsDueForReview(map: WordPerformanceMap, language: Language): WordPerformance[] {
  const now = new Date().toISOString();
  return Object.values(map)
    .filter((wp) => wp.language === language && wp.nextReview <= now)
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
}

export function getMasteryBreakdown(map: WordPerformanceMap, language: Language): { mastered: number; learning: number; struggling: number; unseen: number } {
  const words = Object.values(map).filter((wp) => wp.language === language);
  let mastered = 0, learning = 0, struggling = 0;
  for (const wp of words) {
    const total = wp.timesCorrect + wp.timesIncorrect;
    if (total === 0) continue;
    if (wp.rating === 'easy') { mastered++; continue; }
    const acc = wp.timesCorrect / total;
    if (acc >= 0.8 && wp.streak >= 2) mastered++;
    else if (acc >= 0.5) learning++;
    else struggling++;
  }
  const totalTracked = mastered + learning + struggling;
  return { mastered, learning, struggling, unseen: 800 - totalTracked };
}

/** Migrate legacy FlashcardData into WordPerformanceMap */
export function migrateFlashcardData(
  existing: WordPerformanceMap,
  flashcards: FlashcardData[],
  wordCorpus: { rank: number; word: string; translation: string }[]
): WordPerformanceMap {
  const corpusMap = new Map(wordCorpus.map((w) => [w.rank, w]));
  const result = { ...existing };

  for (const fc of flashcards) {
    const key = wordPerfKey(fc.language, fc.wordRank);
    if (result[key]) continue; // already has data, don't overwrite
    const corpus = corpusMap.get(fc.wordRank);
    if (!corpus) continue;

    const wp = createWordPerformance(fc.wordRank, corpus.word, corpus.translation, fc.language);
    wp.lastSeen = fc.lastSeen;
    wp.nextReview = fc.nextReview;
    wp.reviewCount = fc.reviewCount;
    wp.rating = fc.rating;
    // Map rating to correct/incorrect counts
    if (fc.rating === 'easy') {
      wp.timesCorrect = fc.reviewCount;
      wp.streak = fc.reviewCount;
    } else if (fc.rating === 'moderate') {
      wp.timesCorrect = Math.ceil(fc.reviewCount * 0.6);
      wp.timesIncorrect = fc.reviewCount - wp.timesCorrect;
    } else {
      wp.timesIncorrect = fc.reviewCount;
      wp.streak = 0;
    }
    result[key] = wp;
  }

  return result;
}

// --- Answer normalization ---

export function normalizeAnswer(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[.!?,;:'"]/g, '');
}
