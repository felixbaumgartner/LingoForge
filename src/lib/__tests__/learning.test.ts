import { describe, expect, it, vi } from 'vitest';
import { getLessonCount, getNextLesson, getTodayPracticeCount, getWordStatus, localDayKey } from '../learning';
import { createWordPerformance, getCompletedLevelCount, getMasteryBreakdown, isLessonUnlocked, isLevelComplete, isSectionUnlocked, LESSONS_PER_LEVEL, TOTAL_LEVELS, wordPerfKey } from '../persistence';
import type { Language } from '../../types/language';
import type { LessonType } from '../../types/lesson';
import type { ProgressMap, WordPerformance, WordPerformanceMap } from '../../types/progress';

const languages: Language[] = ['spanish', 'french', 'dutch'];
const tracks: LessonType[] = ['reading', 'writing', 'speaking'];
function emptyProgress(): ProgressMap {
  return {
    spanish: { reading: {}, writing: {}, speaking: {} },
    french: { reading: {}, writing: {}, speaking: {} },
    dutch: { reading: {}, writing: {}, speaking: {} },
  };
}
function completeLevel(progress: ProgressMap, language: Language, type: LessonType, level: number) {
  for (let lesson = 1; lesson <= LESSONS_PER_LEVEL; lesson++) progress[language][type][`${level}-${lesson}`] = { completed: true };
}
function performance(rank: number, overrides: Partial<WordPerformance> = {}): WordPerformance {
  return { ...createWordPerformance(rank, `word${rank}`, `meaning${rank}`, 'spanish'), ...overrides };
}
function mapOf(...words: WordPerformance[]): WordPerformanceMap {
  return Object.fromEntries(words.map((word) => [wordPerfKey(word.language, word.rank), word]));
}

describe('independent skill progression', () => {
  it.each(languages)('opens every first skill lesson immediately for %s', (language) => {
    const progress = emptyProgress();
    for (const type of tracks) {
      expect(isSectionUnlocked(progress, language, type)).toBe(true);
      expect(isLessonUnlocked(progress, language, type, 1, 1)).toBe(true);
      expect(isLessonUnlocked(progress, language, type, 1, 2)).toBe(false);
      expect(getNextLesson(progress, language, type)).toEqual({ level: 1, lesson: 1 });
      expect(getLessonCount(progress, language, type)).toBe(0);
    }
  });

  it.each(tracks)('advances %s without unlocking another skill or language', (type) => {
    const progress = emptyProgress();
    progress.spanish[type]['1-1'] = { completed: true };
    expect(isLessonUnlocked(progress, 'spanish', type, 1, 2)).toBe(true);
    expect(isLessonUnlocked(progress, 'spanish', type, 1, 3)).toBe(false);
    expect(getNextLesson(progress, 'spanish', type)).toEqual({ level: 1, lesson: 2 });
    for (const other of tracks.filter((track) => track !== type)) {
      expect(isLessonUnlocked(progress, 'spanish', other, 1, 2)).toBe(false);
      expect(getNextLesson(progress, 'spanish', other)).toEqual({ level: 1, lesson: 1 });
    }
    expect(getNextLesson(progress, 'french', type)).toEqual({ level: 1, lesson: 1 });
  });

  it.each([
    [0, 1], [-1, 1], [17, 1], [1.5, 1], [NaN, 1], [Infinity, 1],
    [1, 0], [1, -1], [1, 6], [1, 1.5], [1, NaN], [1, Infinity],
  ])('rejects an invalid level %s or lesson %s even with a completion entry', (level, lesson) => {
    const progress = emptyProgress();
    progress.spanish.reading[`${level}-${lesson}`] = { completed: true };
    expect(isLessonUnlocked(progress, 'spanish', 'reading', level, lesson)).toBe(false);
    expect(getLessonCount(progress, 'spanish', 'reading')).toBe(0);
  });

  it('keeps completed lessons replayable when older progress has gaps', () => {
    const progress = emptyProgress();
    progress.spanish.writing['3-4'] = { completed: true };
    expect(isLessonUnlocked(progress, 'spanish', 'writing', 3, 4)).toBe(true);
    expect(isLessonUnlocked(progress, 'spanish', 'writing', 3, 3)).toBe(false);
    expect(getNextLesson(progress, 'spanish', 'writing')).toEqual({ level: 1, lesson: 1 });
    expect(getLessonCount(progress, 'spanish', 'writing')).toBe(1);
  });

  it('requires all five lessons before moving to the next level', () => {
    const progress = emptyProgress();
    completeLevel(progress, 'spanish', 'speaking', 1);
    progress.spanish.speaking['1-3'] = { completed: false };
    expect(isLevelComplete(progress, 'spanish', 'speaking', 1)).toBe(false);
    expect(isLessonUnlocked(progress, 'spanish', 'speaking', 2, 1)).toBe(false);
    expect(getNextLesson(progress, 'spanish', 'speaking')).toEqual({ level: 1, lesson: 3 });
    progress.spanish.speaking['1-3'] = { completed: true };
    expect(isLevelComplete(progress, 'spanish', 'speaking', 1)).toBe(true);
    expect(isLessonUnlocked(progress, 'spanish', 'speaking', 2, 1)).toBe(true);
    expect(getNextLesson(progress, 'spanish', 'speaking')).toEqual({ level: 2, lesson: 1 });
    expect(getCompletedLevelCount(progress, 'spanish', 'speaking')).toBe(1);
  });

  it('returns the last lesson then completion without creating a seventeenth level', () => {
    const progress = emptyProgress();
    for (let level = 1; level <= TOTAL_LEVELS; level++) completeLevel(progress, 'dutch', 'reading', level);
    progress.dutch.reading['16-5'] = { completed: false };
    expect(getNextLesson(progress, 'dutch', 'reading')).toEqual({ level: 16, lesson: 5 });
    expect(getLessonCount(progress, 'dutch', 'reading')).toBe(79);
    progress.dutch.reading['16-5'] = { completed: true };
    expect(getNextLesson(progress, 'dutch', 'reading')).toBeNull();
    expect(getLessonCount(progress, 'dutch', 'reading')).toBe(80);
    expect(getCompletedLevelCount(progress, 'dutch', 'reading')).toBe(16);
    expect(isLessonUnlocked(progress, 'dutch', 'reading', 16, 5)).toBe(true);
    expect(isLessonUnlocked(progress, 'dutch', 'reading', 17, 1)).toBe(false);
    expect(getNextLesson(progress, 'dutch', 'writing')).toEqual({ level: 1, lesson: 1 });
  });
});

describe('daily practice accounting', () => {
  it('uses local calendar components, rather than extracting the UTC date', () => {
    const date = new Date('2026-09-04T23:30:00.000Z');
    vi.spyOn(date, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(date, 'getMonth').mockReturnValue(8);
    vi.spyOn(date, 'getDate').mockReturnValue(5);
    expect(localDayKey(date)).toBe('2026-09-05');
    expect(date.toISOString().slice(0, 10)).toBe('2026-09-04');
  });

  it('counts words with actual review activity today in only the selected language', () => {
    const now = new Date(2026, 8, 5, 12, 0);
    const map = mapOf(
      performance(1, { reviewCount: 1, timesCorrect: 1, lastSeen: new Date(2026, 8, 5, 0, 0).toISOString() }),
      performance(2, { reviewCount: 9, timesIncorrect: 9, lastSeen: now.toISOString() }),
      performance(3, { reviewCount: 0, lastSeen: now.toISOString() }),
      performance(4, { reviewCount: 1, timesCorrect: 1, lastSeen: new Date(2026, 8, 4, 23, 59, 59).toISOString() }),
      performance(5, { reviewCount: 1, timesCorrect: 1, lastSeen: new Date(2026, 8, 6, 0, 0).toISOString() }),
      performance(6, { reviewCount: 1, timesCorrect: 1, lastSeen: 'invalid' }),
      performance(1, { language: 'french', reviewCount: 1, timesCorrect: 1, lastSeen: now.toISOString() }),
    );
    expect(getTodayPracticeCount(map, 'spanish', now)).toBe(2);
    expect(getTodayPracticeCount(map, 'french', now)).toBe(1);
    expect(getTodayPracticeCount(map, 'dutch', now)).toBe(0);
    expect(getTodayPracticeCount({}, 'spanish', now)).toBe(0);
  });
});

describe('consistent word mastery labels', () => {
  it('agrees with the existing breakdown at the accuracy and streak boundaries', () => {
    const words = [
      performance(1),
      performance(2, { timesCorrect: 4, timesIncorrect: 1, streak: 2 }),
      performance(3, { timesCorrect: 4, timesIncorrect: 1, streak: 1 }),
      performance(4, { timesCorrect: 3, timesIncorrect: 1, streak: 3 }),
      performance(5, { timesCorrect: 1, timesIncorrect: 1, streak: 0 }),
      performance(6, { timesCorrect: 0, timesIncorrect: 2, streak: 0 }),
      performance(7, { timesCorrect: 1, timesIncorrect: 4, streak: 0, rating: 'easy' }),
      performance(8, { rating: 'easy' }),
      performance(1, { language: 'french', timesCorrect: 5, streak: 5 }),
    ];
    const breakdown = getMasteryBreakdown(mapOf(...words), 'spanish');
    const selected = words.filter((word) => word.language === 'spanish');
    expect(getWordStatus()).toBe('new');
    expect(selected.map(getWordStatus)).toEqual(['new', 'mastered', 'learning', 'learning', 'learning', 'learning', 'mastered', 'new']);
    expect(selected.filter((word) => getWordStatus(word) === 'mastered')).toHaveLength(breakdown.mastered);
    expect(selected.filter((word) => getWordStatus(word) === 'learning')).toHaveLength(breakdown.learning + breakdown.struggling);
    expect(breakdown.unseen).toBe(800 - selected.filter((word) => getWordStatus(word) !== 'new').length);
  });
});
