import { describe, expect, it } from 'vitest';
import spanishCorpus from '../../../server/data/words/spanish.json';
import frenchCorpus from '../../../server/data/words/french.json';
import dutchCorpus from '../../../server/data/words/dutch.json';
import { appendRetry, buildPracticeQuestions, checkAnswer, meaningOptions, normalizeAnswer, selectPracticeWords } from '../practice';
import { createWordPerformance } from '../persistence';
import type { Word } from '../../types/language';
import type { ProgressMap } from '../../types/progress';

const progress: ProgressMap = {
  spanish: { reading: {}, writing: {}, speaking: {} },
  french: { reading: {}, writing: {}, speaking: {} },
  dutch: { reading: {}, writing: {}, speaking: {} },
};
const corpus: Word[] = Array.from({ length: 15 }, (_, i) => ({ rank: i + 1, word: `word${i + 1}`, translation: `meaning${i + 1}` }));

describe('practice selection', () => {
  it('gives a new learner ten words in frequency order and does not mutate the corpus', () => {
    const reversed = [...corpus].reverse();
    expect(selectPracticeWords(reversed, progress, {}, 'spanish').map((word) => word.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(reversed[0].rank).toBe(15);
  });
  it('prioritizes encountered due words then fills a short session with new words', () => {
    const record = { ...createWordPerformance(15, 'word15', 'meaning15', 'spanish'), nextReview: '2000-01-01T00:00:00.000Z' };
    expect(selectPracticeWords(corpus, progress, { 'spanish-15': record }, 'spanish').map((word) => word.rank)).toEqual([15, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it('introduces three new words after ten words have been practiced and no reviews are urgent', () => {
    const map = Object.fromEntries(corpus.slice(0, 10).map((word) => [`spanish-${word.rank}`, {
      ...createWordPerformance(word.rank, word.word, word.translation, 'spanish'),
      timesCorrect: 2, streak: 2, reviewCount: 2, nextReview: '2999-01-01T00:00:00.000Z',
    }]));
    expect(selectPracticeWords(corpus, progress, map, 'spanish').map((word) => word.rank)).toEqual([11, 12, 13, 1, 2, 3, 4, 5, 6, 7]);
  });
  it('keeps urgent reviews ahead of new words and does not relabel known words beyond the review cap as new', () => {
    const allWords = Array.from({ length: 40 }, (_, i) => ({ rank: i + 1, word: `w${i + 1}`, translation: `m${i + 1}` }));
    const map = Object.fromEntries(allWords.map((word) => [`spanish-${word.rank}`, {
      ...createWordPerformance(word.rank, word.word, word.translation, 'spanish'),
      timesCorrect: 2, streak: 2, reviewCount: 2, nextReview: '2999-01-01T00:00:00.000Z',
    }]));
    map['spanish-39'].nextReview = '2000-01-01T00:00:00.000Z';
    expect(selectPracticeWords(allWords, progress, map, 'spanish').map((word) => word.rank)).toEqual([39, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    allWords.push({ rank: 41, word: 'new', translation: 'new word' });
    expect(selectPracticeWords(allWords, progress, map, 'spanish').map((word) => word.rank)).toEqual([39, 41, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('deduplicates ranks, ignores empty answers and creates independent session word objects', () => {
    const selected = selectPracticeWords([corpus[0], corpus[0], { rank: 2, word: '', translation: 'no' }, { rank: 0, word: 'invalid', translation: 'no' }], progress, {}, 'spanish');
    expect(selected).toEqual([corpus[0]]);
    selected[0].word = 'changed';
    expect(corpus[0].word).toBe('word1');
    expect(selectPracticeWords([], progress, {}, 'spanish')).toEqual([]);
  });
});

describe('answer checks', () => {
  it('accepts canonical Unicode, capitalization, surrounding punctuation and whitespace', () => {
    expect(checkAnswer('  ¡CAFÉ! ', 'cafe\u0301')).toBe('correct');
    expect(normalizeAnswer('  un   café  ')).toBe('un café');
  });
  it('gives targeted accent feedback without crediting a different spelling', () => {
    expect(checkAnswer('cafe', 'café')).toBe('accent');
    expect(checkAnswer('ano', 'año')).toBe('accent');
    expect(checkAnswer('cafes', 'café')).toBe('incorrect');
  });
  it('never accepts blank or punctuation-only answers even against blank targets', () => {
    expect(checkAnswer('', '')).toBe('incorrect');
    expect(checkAnswer(' ... ', '!!!')).toBe('incorrect');
    expect(checkAnswer('a', '')).toBe('incorrect');
  });
});

describe('question generation', () => {
  it('excludes duplicate words and overlapping translation alternatives', () => {
    const target = { rank: 1, word: 'de', translation: 'of, from' };
    const words = [target, { rank: 2, word: 'desde', translation: 'from' }, { rank: 3, word: 'DE', translation: 'made of' }, { rank: 4, word: 'en', translation: 'in, on' }, { rank: 5, word: 'sobre', translation: 'on' }, { rank: 6, word: 'y', translation: 'and' }, { rank: 7, word: 'o', translation: 'or' }];
    const options = meaningOptions(target, words, () => 0.99);
    expect(options).toEqual(['of, from', 'in, on', 'and', 'or']);
    expect(new Set(options).size).toBe(4);
  });
  it('mixes recognition with recall and falls back to typing for a one-word corpus', () => {
    expect(buildPracticeQuestions(corpus.slice(0, 4), corpus, () => 0.5).map((question) => question.mode)).toEqual(['meaning', 'typing', 'meaning', 'typing']);
    expect(buildPracticeQuestions([corpus[0]], [corpus[0]])[0].mode).toBe('typing');
  });
  it('uses recognition when an English cue has multiple valid target words', () => {
    const words = [corpus[0], { rank: 2, word: 'tu', translation: 'you' }, { rank: 3, word: 'vous', translation: 'you' }];
    expect(buildPracticeQuestions(words, words)[1].mode).toBe('meaning');
  });
  it('recognizes overlapping slash and parenthetical meanings as ambiguous cues', () => {
    const words = [
      { rank: 1, word: 'de', translation: 'the' },
      { rank: 2, word: 'het', translation: 'the / it' },
      { rank: 3, word: 'dat', translation: 'that' },
      { rank: 4, word: 'die', translation: 'that / who' },
      { rank: 5, word: 'el', translation: 'the (masc.)' },
    ];
    expect(buildPracticeQuestions(words, words).map((question) => question.mode)).toEqual(['meaning', 'meaning', 'meaning', 'meaning', 'meaning']);
  });
  it.each(['spanish', 'french', 'dutch'] as const)('never asks for an ambiguous exact spelling across the full %s corpus', (language) => {
    const words: Word[] = { spanish: spanishCorpus, french: frenchCorpus, dutch: dutchCorpus }[language];
    const questions = buildPracticeQuestions(words, words, () => 0.5);
    // Include a table of known ambiguity patterns independently of the production helper.
    const aliases = (translation: string) => translation.replace(/\([^)]*\)/g, '').split(/[,;/]/).map((part) => part.toLowerCase().trim()).filter(Boolean);
    for (const question of questions.filter((item) => item.mode === 'typing')) {
      const targetAliases = aliases(question.word.translation);
      const competitors = words.filter((word) => word.word.toLowerCase() !== question.word.word.toLowerCase()
        && aliases(word.translation).some((alias) => targetAliases.includes(alias)));
      expect(competitors, `Ambiguous typing cue: ${question.word.translation}`).toEqual([]);
    }
    expect(questions.some((question) => question.mode === 'typing')).toBe(true);
  });
  it('appends missed words after original questions in order and retries each only once', () => {
    const original = buildPracticeQuestions(corpus.slice(0, 3), corpus, () => 0.5);
    const firstMiss = appendRetry(original, 0);
    const bothMisses = appendRetry(firstMiss, 2);
    expect(bothMisses.map((question) => [question.word.rank, question.retry])).toEqual([[1, false], [2, false], [3, false], [1, true], [3, true]]);
    expect(appendRetry(bothMisses, 0)).toBe(bothMisses);
    expect(appendRetry(bothMisses, 3)).toBe(bothMisses);
    expect(appendRetry(bothMisses, 100)).toBe(bothMisses);
    expect(original).toHaveLength(3);
  });
});
