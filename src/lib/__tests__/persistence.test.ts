import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeAnswer,
  createWordPerformance,
  recordWordResult,
  recordWordRating,
  getWeakWords,
  getMasteryBreakdown,
  wordPerfKey,
  loadWordPerformance,
  saveWordPerformance,
  migrateFlashcardData,
} from '../persistence';
import type { WordPerformanceMap } from '../../types/progress';
import type { FlashcardData } from '../../types/progress';

// Mock localStorage
const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  });
});

describe('normalizeAnswer', () => {
  it('lowercases and trims', () => {
    expect(normalizeAnswer('  Hello  ')).toBe('hello');
  });

  it('strips punctuation', () => {
    expect(normalizeAnswer('Hello, world!')).toBe('hello world');
  });

  it('strips accents (accent-insensitive)', () => {
    expect(normalizeAnswer('está')).toBe('esta');
    expect(normalizeAnswer('français')).toBe('francais');
    expect(normalizeAnswer('über')).toBe('uber');
    expect(normalizeAnswer('señor')).toBe('senor');
  });

  it('handles accented and non-accented comparison', () => {
    expect(normalizeAnswer('está')).toBe(normalizeAnswer('esta'));
    expect(normalizeAnswer('café')).toBe(normalizeAnswer('cafe'));
  });

  it('handles empty string', () => {
    expect(normalizeAnswer('')).toBe('');
  });
});

describe('createWordPerformance', () => {
  it('creates with default values', () => {
    const wp = createWordPerformance(42, 'estar', 'to be', 'spanish');
    expect(wp.rank).toBe(42);
    expect(wp.word).toBe('estar');
    expect(wp.language).toBe('spanish');
    expect(wp.timesCorrect).toBe(0);
    expect(wp.timesIncorrect).toBe(0);
    expect(wp.streak).toBe(0);
    expect(wp.easeFactor).toBe(2.5);
    expect(wp.interval).toBe(0);
    expect(wp.rating).toBeNull();
  });
});

describe('recordWordResult', () => {
  it('creates new record on first encounter', () => {
    const map: WordPerformanceMap = {};
    const result = recordWordResult(map, 'spanish', 42, 'estar', 'to be', true);
    const key = wordPerfKey('spanish', 42);
    expect(result[key]).toBeDefined();
    expect(result[key].timesCorrect).toBe(1);
    expect(result[key].timesIncorrect).toBe(0);
    expect(result[key].streak).toBe(1);
  });

  it('increments correct count and streak', () => {
    let map: WordPerformanceMap = {};
    map = recordWordResult(map, 'spanish', 42, 'estar', 'to be', true);
    map = recordWordResult(map, 'spanish', 42, 'estar', 'to be', true);
    const key = wordPerfKey('spanish', 42);
    expect(map[key].timesCorrect).toBe(2);
    expect(map[key].streak).toBe(2);
  });

  it('resets streak on incorrect', () => {
    let map: WordPerformanceMap = {};
    map = recordWordResult(map, 'spanish', 42, 'estar', 'to be', true);
    map = recordWordResult(map, 'spanish', 42, 'estar', 'to be', true);
    map = recordWordResult(map, 'spanish', 42, 'estar', 'to be', false);
    const key = wordPerfKey('spanish', 42);
    expect(map[key].streak).toBe(0);
    expect(map[key].timesIncorrect).toBe(1);
    expect(map[key].timesCorrect).toBe(2);
  });

  it('sets interval to 1 on first correct', () => {
    let map: WordPerformanceMap = {};
    map = recordWordResult(map, 'spanish', 42, 'estar', 'to be', true);
    const key = wordPerfKey('spanish', 42);
    expect(map[key].interval).toBe(1);
  });

  it('resets interval to 1 on incorrect', () => {
    let map: WordPerformanceMap = {};
    map = recordWordResult(map, 'spanish', 42, 'estar', 'to be', true);
    map = recordWordResult(map, 'spanish', 42, 'estar', 'to be', true);
    map = recordWordResult(map, 'spanish', 42, 'estar', 'to be', false);
    const key = wordPerfKey('spanish', 42);
    expect(map[key].interval).toBe(1);
  });

  it('does not mutate original map', () => {
    const map: WordPerformanceMap = {};
    const result = recordWordResult(map, 'spanish', 42, 'estar', 'to be', true);
    expect(map).toEqual({});
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('keeps ease factor above 1.3', () => {
    let map: WordPerformanceMap = {};
    // Repeatedly get wrong to push ease factor down
    for (let i = 0; i < 20; i++) {
      map = recordWordResult(map, 'spanish', 42, 'estar', 'to be', false);
    }
    const key = wordPerfKey('spanish', 42);
    expect(map[key].easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});

describe('recordWordRating', () => {
  it('records hard as incorrect', () => {
    const map: WordPerformanceMap = {};
    const result = recordWordRating(map, 'spanish', 42, 'estar', 'to be', 'hard');
    const key = wordPerfKey('spanish', 42);
    expect(result[key].timesIncorrect).toBe(1);
    expect(result[key].rating).toBe('hard');
    expect(result[key].interval).toBe(1);
  });

  it('records easy as correct with 7-day interval', () => {
    const map: WordPerformanceMap = {};
    const result = recordWordRating(map, 'spanish', 42, 'estar', 'to be', 'easy');
    const key = wordPerfKey('spanish', 42);
    expect(result[key].timesCorrect).toBe(1);
    expect(result[key].rating).toBe('easy');
    expect(result[key].interval).toBe(7);
  });

  it('records moderate as correct with 3-day interval', () => {
    const map: WordPerformanceMap = {};
    const result = recordWordRating(map, 'spanish', 42, 'estar', 'to be', 'moderate');
    const key = wordPerfKey('spanish', 42);
    expect(result[key].timesCorrect).toBe(1);
    expect(result[key].interval).toBe(3);
  });
});

describe('getWeakWords', () => {
  it('returns empty for no data', () => {
    expect(getWeakWords({}, 'spanish')).toEqual([]);
  });

  it('excludes words with fewer than 2 attempts', () => {
    let map: WordPerformanceMap = {};
    map = recordWordResult(map, 'spanish', 1, 'la', 'the', false);
    expect(getWeakWords(map, 'spanish')).toEqual([]);
  });

  it('sorts by accuracy ascending (weakest first)', () => {
    let map: WordPerformanceMap = {};
    // Word 1: 1/3 correct = 33%
    map = recordWordResult(map, 'spanish', 1, 'la', 'the', true);
    map = recordWordResult(map, 'spanish', 1, 'la', 'the', false);
    map = recordWordResult(map, 'spanish', 1, 'la', 'the', false);
    // Word 2: 2/3 correct = 67%
    map = recordWordResult(map, 'spanish', 2, 'el', 'the', true);
    map = recordWordResult(map, 'spanish', 2, 'el', 'the', true);
    map = recordWordResult(map, 'spanish', 2, 'el', 'the', false);

    const weak = getWeakWords(map, 'spanish');
    expect(weak).toHaveLength(2);
    expect(weak[0].word).toBe('la');  // 33% accuracy
    expect(weak[1].word).toBe('el');  // 67% accuracy
  });

  it('excludes mastered words (80%+ accuracy with streak >= 2)', () => {
    let map: WordPerformanceMap = {};
    // Word at 100% with streak 3 — mastered, should NOT appear
    map = recordWordResult(map, 'spanish', 1, 'la', 'the', true);
    map = recordWordResult(map, 'spanish', 1, 'la', 'the', true);
    map = recordWordResult(map, 'spanish', 1, 'la', 'the', true);
    // Word at 50% — should appear
    map = recordWordResult(map, 'spanish', 2, 'el', 'the', true);
    map = recordWordResult(map, 'spanish', 2, 'el', 'the', false);

    const weak = getWeakWords(map, 'spanish');
    expect(weak).toHaveLength(1);
    expect(weak[0].word).toBe('el');
  });

  it('filters by language', () => {
    let map: WordPerformanceMap = {};
    map = recordWordResult(map, 'spanish', 1, 'la', 'the', false);
    map = recordWordResult(map, 'spanish', 1, 'la', 'the', false);
    map = recordWordResult(map, 'french', 1, 'le', 'the', false);
    map = recordWordResult(map, 'french', 1, 'le', 'the', false);

    expect(getWeakWords(map, 'spanish')).toHaveLength(1);
    expect(getWeakWords(map, 'french')).toHaveLength(1);
  });

  it('respects limit', () => {
    let map: WordPerformanceMap = {};
    for (let i = 1; i <= 20; i++) {
      map = recordWordResult(map, 'spanish', i, `word${i}`, `trans${i}`, false);
      map = recordWordResult(map, 'spanish', i, `word${i}`, `trans${i}`, false);
    }
    expect(getWeakWords(map, 'spanish', 5)).toHaveLength(5);
  });
});

describe('getMasteryBreakdown', () => {
  it('returns all zeros for empty data', () => {
    const result = getMasteryBreakdown({}, 'spanish');
    expect(result).toEqual({ mastered: 0, learning: 0, struggling: 0, unseen: 800 });
  });

  it('categorizes words correctly', () => {
    let map: WordPerformanceMap = {};
    // Mastered: 80%+ accuracy with streak >= 2
    map = recordWordResult(map, 'spanish', 1, 'la', 'the', true);
    map = recordWordResult(map, 'spanish', 1, 'la', 'the', true);
    map = recordWordResult(map, 'spanish', 1, 'la', 'the', true);

    // Learning: 50-79% accuracy
    map = recordWordResult(map, 'spanish', 2, 'el', 'the', true);
    map = recordWordResult(map, 'spanish', 2, 'el', 'the', false);

    // Struggling: <50% accuracy
    map = recordWordResult(map, 'spanish', 3, 'que', 'that', false);
    map = recordWordResult(map, 'spanish', 3, 'que', 'that', false);

    const result = getMasteryBreakdown(map, 'spanish');
    expect(result.mastered).toBe(1);
    expect(result.learning).toBe(1);
    expect(result.struggling).toBe(1);
    expect(result.unseen).toBe(797);
  });
});

describe('loadWordPerformance / saveWordPerformance', () => {
  it('returns empty object when no data', () => {
    expect(loadWordPerformance()).toEqual({});
  });

  it('round-trips data through localStorage', () => {
    let map: WordPerformanceMap = {};
    map = recordWordResult(map, 'spanish', 42, 'estar', 'to be', true);
    saveWordPerformance(map);
    const loaded = loadWordPerformance();
    expect(loaded[wordPerfKey('spanish', 42)].timesCorrect).toBe(1);
  });

  it('handles corrupted localStorage gracefully', () => {
    store['lingoforge_word_performance'] = 'not json!!!';
    expect(loadWordPerformance()).toEqual({});
  });
});

describe('migrateFlashcardData', () => {
  const corpus = [
    { rank: 1, word: 'la', translation: 'the (fem.)' },
    { rank: 2, word: 'el', translation: 'the (masc.)' },
  ];

  it('migrates flashcard data to WordPerformance', () => {
    const flashcards: FlashcardData[] = [
      { wordRank: 1, language: 'spanish', rating: 'easy', lastSeen: '2026-01-01T00:00:00Z', nextReview: '2026-01-08T00:00:00Z', reviewCount: 5 },
    ];
    const result = migrateFlashcardData({}, flashcards, corpus);
    const key = wordPerfKey('spanish', 1);
    expect(result[key]).toBeDefined();
    expect(result[key].word).toBe('la');
    expect(result[key].timesCorrect).toBe(5);
    expect(result[key].rating).toBe('easy');
  });

  it('does not overwrite existing WordPerformance data', () => {
    let existing: WordPerformanceMap = {};
    existing = recordWordResult(existing, 'spanish', 1, 'la', 'the (fem.)', true);

    const flashcards: FlashcardData[] = [
      { wordRank: 1, language: 'spanish', rating: 'hard', lastSeen: '2026-01-01T00:00:00Z', nextReview: '2026-01-02T00:00:00Z', reviewCount: 10 },
    ];
    const result = migrateFlashcardData(existing, flashcards, corpus);
    const key = wordPerfKey('spanish', 1);
    // Should keep existing data, not overwrite with flashcard
    expect(result[key].timesCorrect).toBe(1);
  });

  it('skips flashcards with unknown ranks', () => {
    const flashcards: FlashcardData[] = [
      { wordRank: 999, language: 'spanish', rating: 'hard', lastSeen: '2026-01-01T00:00:00Z', nextReview: '2026-01-02T00:00:00Z', reviewCount: 1 },
    ];
    const result = migrateFlashcardData({}, flashcards, corpus);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('maps hard rating to all incorrect', () => {
    const flashcards: FlashcardData[] = [
      { wordRank: 2, language: 'spanish', rating: 'hard', lastSeen: '2026-01-01T00:00:00Z', nextReview: '2026-01-02T00:00:00Z', reviewCount: 3 },
    ];
    const result = migrateFlashcardData({}, flashcards, corpus);
    const key = wordPerfKey('spanish', 2);
    expect(result[key].timesIncorrect).toBe(3);
    expect(result[key].timesCorrect).toBe(0);
    expect(result[key].streak).toBe(0);
  });
});

describe('wordPerfKey', () => {
  it('creates consistent keys', () => {
    expect(wordPerfKey('spanish', 42)).toBe('spanish-42');
    expect(wordPerfKey('french', 1)).toBe('french-1');
  });
});
