import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWordPerformance, getRatingIntervals, getWeakWords, recordWordRating, recordWordResult, wordPerfKey } from '../persistence';
import type { WordPerformance, WordPerformanceMap } from '../../types/progress';

const now = new Date('2026-09-05T12:00:00.000Z');
const key = wordPerfKey('spanish', 42);
const day = 86400000;
function existing(overrides: Partial<WordPerformance> = {}): WordPerformance {
  return {
    ...createWordPerformance(42, 'estar', 'to be', 'spanish'),
    reviewCount: 2, timesCorrect: 2, streak: 2, interval: 7, easeFactor: 2.5,
    nextReview: now.toISOString(), ...overrides,
  };
}
function rate(map: WordPerformanceMap, rating: 'hard' | 'moderate' | 'easy') {
  return recordWordRating(map, 'spanish', 42, 'estar', 'to be', rating);
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());

describe('objective answer scheduling', () => {
  it('keeps repeated early correct answers at one day, then advances to three when due', () => {
    let map = recordWordResult({}, 'spanish', 42, 'estar', 'to be', true);
    expect(map[key].interval).toBe(1);
    for (let attempt = 0; attempt < 10; attempt++) {
      map = recordWordResult(map, 'spanish', 42, 'estar', 'to be', true);
      expect(map[key].interval).toBe(1);
    }
    vi.setSystemTime(new Date(map[key].nextReview));
    map = recordWordResult(map, 'spanish', 42, 'estar', 'to be', true);
    expect(map[key].interval).toBe(3);
  });

  it('preserves a mature interval during early quiz replay and caps due growth at 180 days', () => {
    const early = existing({ interval: 100, nextReview: new Date(now.getTime() + day).toISOString() });
    const replayed = recordWordResult({ [key]: early }, 'spanish', 42, 'estar', 'to be', true);
    expect(replayed[key].interval).toBe(100);
    vi.setSystemTime(new Date(replayed[key].nextReview));
    const due = recordWordResult(replayed, 'spanish', 42, 'estar', 'to be', true);
    expect(due[key].interval).toBe(180);
    expect(getRatingIntervals(due[key]).easy).toBe(180);
    expect(rate(due, 'easy')[key].interval).toBe(180);
  });

  it('resets an incorrect objective answer to one day even during an early review', () => {
    const early = existing({ interval: 100, rating: 'easy', nextReview: new Date(now.getTime() + day).toISOString() });
    const saved = recordWordResult({ [key]: early }, 'spanish', 42, 'estar', 'to be', false)[key];
    expect(saved.interval).toBe(1);
    expect(saved.rating).toBeNull();
    expect(saved.streak).toBe(0);
  });
});

describe('adaptive self-rating schedule', () => {
  it('starts untracked and zero-review words at 1, 3 and 7 days', () => {
    expect(getRatingIntervals()).toEqual({ hard: 1, moderate: 3, easy: 7 });
    expect(getRatingIntervals(createWordPerformance(42, 'estar', 'to be', 'spanish'))).toEqual({ hard: 1, moderate: 3, easy: 7 });
    for (const [rating, interval] of [['hard', 1], ['moderate', 3], ['easy', 7]] as const) {
      const saved = rate({}, rating)[key];
      expect(saved.interval).toBe(interval);
      expect(saved.nextReview).toBe(new Date(now.getTime() + interval * day).toISOString());
    }
  });

  it('does not compound intervals when Easy is repeated before a review is due', () => {
    let map = rate({}, 'easy');
    for (let attempt = 0; attempt < 10; attempt++) {
      expect(getRatingIntervals(map[key]).easy).toBe(7);
      map = rate(map, 'easy');
      expect(map[key].interval).toBe(7);
    }
    expect(map[key].reviewCount).toBe(11);
  });

  it('grows a successful due Easy interval using the existing ease factor', () => {
    const map = { [key]: existing() };
    expect(getRatingIntervals(map[key]).easy).toBe(18);
    const saved = rate(map, 'easy')[key];
    expect(saved.interval).toBe(18);
    expect(saved.nextReview).toBe(new Date(now.getTime() + 18 * day).toISOString());
    expect(saved.rating).toBe('easy');
    expect(getWeakWords({ [key]: saved }, 'spanish')).toEqual([]);
  });

  it('resets a due or early Hard interval to one day and restores weak-word eligibility', () => {
    for (const nextReview of [now.toISOString(), new Date(now.getTime() + 50 * day).toISOString()]) {
      const map = { [key]: existing({ interval: 60, rating: 'easy', timesCorrect: 1, timesIncorrect: 3, nextReview }) };
      expect(getRatingIntervals(map[key]).hard).toBe(1);
      const saved = rate(map, 'hard');
      expect(saved[key].interval).toBe(1);
      expect(saved[key].streak).toBe(0);
      expect(saved[key].rating).toBe('hard');
      expect(getWeakWords(saved, 'spanish').map((word) => word.rank)).toEqual([42]);
    }
  });

  it('grows Moderate due reviews by 1.5, keeps a 3-day floor and preserves early intervals', () => {
    expect(getRatingIntervals(existing({ interval: 1 })).moderate).toBe(3);
    expect(getRatingIntervals(existing({ interval: 7 })).moderate).toBe(11);
    const early = existing({ interval: 20, nextReview: new Date(now.getTime() + day).toISOString() });
    expect(getRatingIntervals(early).moderate).toBe(20);
    expect(rate({ [key]: early }, 'moderate')[key].interval).toBe(20);
  });

  it('uses the due boundary without treating a future review as due', () => {
    expect(getRatingIntervals(existing({ nextReview: new Date(now.getTime() + 1).toISOString() })).easy).toBe(7);
    expect(getRatingIntervals(existing({ nextReview: now.toISOString() })).easy).toBe(18);
    expect(getRatingIntervals(existing({ nextReview: new Date(now.getTime() - day).toISOString() })).easy).toBe(18);
  });

  it('caps intervals at 180 days and clamps extreme ease factors', () => {
    expect(getRatingIntervals(existing({ interval: 100, easeFactor: 20 }))).toEqual({ hard: 1, moderate: 150, easy: 180 });
    expect(getRatingIntervals(existing({ interval: 100, easeFactor: -20 })).easy).toBe(130);
    expect(getRatingIntervals(existing({ interval: 180 }))).toEqual({ hard: 1, moderate: 180, easy: 180 });
    expect(getRatingIntervals(existing({ interval: NaN, easeFactor: NaN }))).toEqual({ hard: 1, moderate: 3, easy: 7 });
  });

  it.each(['hard', 'moderate', 'easy'] as const)('persists exactly the %s interval preview without mutating existing data', (rating) => {
    const word = existing({ interval: 17, easeFactor: 2.1 });
    const map = { [key]: word };
    const before = structuredClone(map);
    const preview = getRatingIntervals(word);
    const saved = rate(map, rating)[key];
    expect(saved.interval).toBe(preview[rating]);
    expect(saved.nextReview).toBe(new Date(now.getTime() + preview[rating] * day).toISOString());
    expect(map).toEqual(before);
  });
});
