import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWordPerformance, recordWordRating, wordPerfKey } from '../persistence';
import { getReviewableRanks, selectReviewWords } from '../review';
import type { Language, Word } from '../../types/language';
import type { ProgressMap, WordPerformance, WordPerformanceMap } from '../../types/progress';

const languages: Language[] = ['spanish', 'french', 'dutch'];
const now = new Date('2026-09-05T12:00:00.000Z');
const future = '2026-09-12T12:00:00.000Z';

function emptyProgress(): ProgressMap {
  return {
    spanish: { reading: {}, writing: {}, speaking: {} },
    french: { reading: {}, writing: {}, speaking: {} },
    dutch: { reading: {}, writing: {}, speaking: {} },
  };
}

function corpus(count = 800): Word[] {
  return Array.from({ length: count }, (_, index) => ({
    rank: index + 1,
    word: `word${index + 1}`,
    translation: `translation${index + 1}`,
  }));
}

function performance(
  language: Language,
  rank: number,
  overrides: Partial<WordPerformance> = {},
): WordPerformance {
  return {
    ...createWordPerformance(rank, `word${rank}`, `translation${rank}`, language),
    timesCorrect: 3,
    streak: 3,
    reviewCount: 3,
    nextReview: future,
    ...overrides,
  };
}

function mapOf(...records: WordPerformance[]): WordPerformanceMap {
  return Object.fromEntries(records.map((record) => [wordPerfKey(record.language, record.rank), record]));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => vi.useRealTimers());

describe('getReviewableRanks', () => {
  it.each(languages)('makes exactly the first lesson available in %s', (language) => {
    const progress = emptyProgress();
    progress[language].reading['1-1'] = { completed: true };

    expect([...getReviewableRanks(progress, {}, language)]).toEqual(
      Array.from({ length: 10 }, (_, index) => index + 1),
    );
  });

  it('uses each completed lesson range without filling gaps between lessons', () => {
    const progress = emptyProgress();
    progress.spanish.reading['1-2'] = { completed: true };
    progress.spanish.writing['3-4'] = { completed: true };
    progress.spanish.speaking['16-5'] = { completed: true };
    progress.spanish.reading['2-1'] = { completed: false };

    const ranks = getReviewableRanks(progress, {}, 'spanish');
    expect([...ranks].sort((a, b) => a - b)).toEqual([
      ...Array.from({ length: 10 }, (_, index) => index + 11),
      ...Array.from({ length: 10 }, (_, index) => index + 131),
      ...Array.from({ length: 10 }, (_, index) => index + 791),
    ]);
  });

  it('unions tracked words with completed lessons and deduplicates across sections', () => {
    const progress = emptyProgress();
    progress.spanish.reading['1-1'] = { completed: true };
    progress.spanish.writing['1-1'] = { completed: true };
    const map = mapOf(performance('spanish', 5), performance('spanish', 76));

    const ranks = getReviewableRanks(progress, map, 'spanish');
    expect(ranks.size).toBe(11);
    expect(ranks.has(76)).toBe(true);
  });

  it('ignores invalid lesson keys and out-of-range or fractional tracked ranks', () => {
    const progress = emptyProgress();
    for (const key of ['0-1', '17-1', '1-0', '1-6', '1-1-extra', '1.5-1', 'invalid']) {
      progress.spanish.reading[key] = { completed: true };
    }
    const map = mapOf(...[0, -1, 801, 1.5].map((rank) => performance('spanish', rank)));

    expect(getReviewableRanks(progress, map, 'spanish').size).toBe(0);
  });

  it.each(languages)('keeps completed lessons and tracked words isolated for %s', (language) => {
    const progress = emptyProgress();
    const others = languages.filter((candidate) => candidate !== language);
    for (const other of others) progress[other].reading['1-1'] = { completed: true };
    const map = mapOf(...others.map((other) => performance(other, 50)), performance(language, 71));

    expect([...getReviewableRanks(progress, map, language)]).toEqual([71]);
  });
});

describe('selectReviewWords', () => {
  it('returns an empty session when no words have been encountered', () => {
    expect(selectReviewWords(corpus(), emptyProgress(), {}, 'spanish')).toEqual([]);
  });

  it('prioritizes oldest due words, then weak words, then remaining ranks', () => {
    const progress = emptyProgress();
    progress.spanish.reading['1-1'] = { completed: true };
    const map = mapOf(
      performance('spanish', 8, { nextReview: '2026-09-03T12:00:00.000Z' }),
      performance('spanish', 9, { nextReview: '2026-09-01T12:00:00.000Z' }),
      performance('spanish', 6, { timesCorrect: 0, timesIncorrect: 2, streak: 0 }),
    );

    expect(selectReviewWords(corpus(), progress, map, 'spanish').map((word) => word.rank))
      .toEqual([9, 8, 6, 1, 2, 3, 4, 5, 7, 10]);
  });

  it('due mode includes the due boundary and excludes future and other-language words', () => {
    const map = mapOf(
      performance('spanish', 1, { nextReview: now.toISOString() }),
      performance('spanish', 2, { nextReview: '2026-09-05T11:59:59.000Z' }),
      performance('spanish', 3, { nextReview: '2026-09-05T12:00:00.001Z' }),
      performance('french', 4, { nextReview: '2026-09-01T12:00:00.000Z' }),
    );

    expect(selectReviewWords(corpus(), emptyProgress(), map, 'spanish', 'due').map((word) => word.rank))
      .toEqual([2, 1]);
  });

  it('weak mode follows the existing attempt threshold and Easy graduation rules', () => {
    const map = mapOf(
      performance('spanish', 1, { timesCorrect: 0, timesIncorrect: 2, streak: 0 }),
      performance('spanish', 2, { timesCorrect: 0, timesIncorrect: 1, streak: 0, rating: 'hard' }),
      performance('spanish', 3, { timesCorrect: 0, timesIncorrect: 3, streak: 0, rating: 'easy' }),
      performance('spanish', 4),
      performance('french', 5, { timesCorrect: 0, timesIncorrect: 2, streak: 0 }),
    );

    expect(selectReviewWords(corpus(), emptyProgress(), map, 'spanish', 'weak').map((word) => word.rank))
      .toEqual([1]);
  });

  it('caps sessions at 30 cards with deterministic ordering independent of corpus order', () => {
    const words = corpus(50).reverse();
    const map = mapOf(...words.map((word) => performance('spanish', word.rank)));

    const first = selectReviewWords(words, emptyProgress(), map, 'spanish');
    const second = selectReviewWords([...words].reverse(), emptyProgress(), map, 'spanish');
    expect(first.map((word) => word.rank)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
    expect(second).toEqual(first);
  });

  it('leaves source data and an existing session intact when a word graduates', () => {
    const words = corpus(2).reverse();
    const progress = emptyProgress();
    const map = mapOf(
      performance('spanish', 1, { timesCorrect: 0, timesIncorrect: 2, streak: 0 }),
      performance('spanish', 2, { timesCorrect: 0, timesIncorrect: 2, streak: 0 }),
    );
    const original = structuredClone({ words, progress, map });
    const session = selectReviewWords(words, progress, map, 'spanish', 'weak');
    const updated = recordWordRating(map, 'spanish', 1, 'word1', 'translation1', 'easy');

    expect(selectReviewWords(words, progress, updated, 'spanish', 'weak').map((word) => word.rank)).toEqual([2]);
    expect(session.map((word) => word.rank)).toEqual([1, 2]);
    expect({ words, progress, map }).toEqual(original);
  });

  it('excludes tracked records missing from the corpus', () => {
    const map = mapOf(performance('spanish', 1), performance('spanish', 50));

    expect(selectReviewWords(corpus(10), emptyProgress(), map, 'spanish').map((word) => word.rank)).toEqual([1]);
  });

  it('offers unseen words first when starting another session after 30 Easy ratings', () => {
    const progress = emptyProgress();
    for (let lesson = 1; lesson <= 5; lesson++) {
      progress.spanish.reading[`1-${lesson}`] = { completed: true };
    }
    const words = corpus(50);
    const firstSession = selectReviewWords(words, progress, {}, 'spanish');
    let map: WordPerformanceMap = {};
    for (const word of firstSession) {
      map = recordWordRating(map, 'spanish', word.rank, word.word, word.translation, 'easy');
    }

    const nextSession = selectReviewWords(words, progress, map, 'spanish');
    expect(nextSession.slice(0, 20).map((word) => word.rank))
      .toEqual(Array.from({ length: 20 }, (_, index) => index + 31));
    expect(nextSession).toHaveLength(30);
  });

  it('prioritizes oldest activity within a priority group and breaks activity ties by rank', () => {
    const map = mapOf(
      performance('spanish', 1, { lastSeen: '2026-09-04T12:00:00.000Z' }),
      performance('spanish', 2, { lastSeen: '2026-09-01T12:00:00.000Z' }),
      performance('spanish', 3, { lastSeen: '2026-09-01T12:00:00.000Z' }),
    );

    const selected = selectReviewWords(corpus(3).reverse(), emptyProgress(), map, 'spanish');
    expect(selected.map((word) => word.rank)).toEqual([2, 3, 1]);
  });
});
