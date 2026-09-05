import type { Language, Word } from '../types/language';
import type { ProgressMap, WordPerformanceMap } from '../types/progress';
import { getReviewableRanks, selectReviewWords } from './review';
import { getWeakWords, getWordsDueForReview } from './persistence';

export const PRACTICE_SIZE = 10;
export type PracticeQuestion = { word: Word; mode: 'meaning' | 'typing'; options: string[]; retry: boolean };

/** Keep accents meaningful, but ignore case, surrounding punctuation and excess spaces. */
export function normalizeAnswer(value: string): string {
  return value.normalize('NFC').toLocaleLowerCase().trim()
    .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '').replace(/\s+/g, ' ');
}

export function checkAnswer(answer: string, expected: string): 'correct' | 'accent' | 'incorrect' {
  const actual = normalizeAnswer(answer);
  const target = normalizeAnswer(expected);
  if (!actual || !target) return 'incorrect';
  if (actual === target) return 'correct';
  const withoutAccents = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '');
  return withoutAccents(actual) === withoutAccents(target) ? 'accent' : 'incorrect';
}

function cleanWords(corpus: Word[]): Word[] {
  const ranks = new Set<number>();
  return corpus.filter((word) => {
    if (!word || typeof word !== 'object' || !Number.isInteger(word.rank) || word.rank < 1 || word.rank > 800 || ranks.has(word.rank)
      || typeof word.word !== 'string' || typeof word.translation !== 'string'
      || !normalizeAnswer(word.word) || !normalizeAnswer(word.translation)) return false;
    ranks.add(word.rank);
    return true;
  });
}

export function selectPracticeWords(corpus: Word[], progress: ProgressMap, map: WordPerformanceMap, language: Language): Word[] {
  const valid = cleanWords(corpus);
  const review = selectReviewWords(valid, progress, map, language);
  const encountered = getReviewableRanks(progress, map, language);
  const priority = new Set([
    ...getWordsDueForReview(map, language).map((word) => word.rank),
    ...getWeakWords(map, language, 800).map((word) => word.rank),
  ]);
  const urgent = review.filter((word) => priority.has(word.rank)).slice(0, PRACTICE_SIZE);
  const newWords = valid.filter((word) => !encountered.has(word.rank)).sort((a, b) => a.rank - b.rank);
  // Leave room for new vocabulary after urgent reviews so daily practice keeps progressing.
  const reserved = newWords.slice(0, Math.min(3, PRACTICE_SIZE - urgent.length));
  return [...urgent, ...reserved, ...review.filter((word) => !priority.has(word.rank)), ...newWords.slice(reserved.length)]
    .slice(0, PRACTICE_SIZE).map((word) => ({ ...word }));
}

function meanings(value: string): string[] {
  return value.replace(/\([^)]*\)/g, '').split(/[,;/]/).map(normalizeAnswer).filter(Boolean);
}

/** Exclude identical words and overlapping translations so there is one unambiguous choice. */
export function meaningOptions(word: Word, corpus: Word[], random: () => number = Math.random): string[] {
  const choices = [word.translation];
  const used = new Set(meanings(word.translation));
  const shuffled = [...cleanWords(corpus)];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  for (const candidate of shuffled) {
    const parts = meanings(candidate.translation);
    if (normalizeAnswer(candidate.word) === normalizeAnswer(word.word) || parts.some((part) => used.has(part))) continue;
    choices.push(candidate.translation);
    parts.forEach((part) => used.add(part));
    if (choices.length === 4) break;
  }
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

export function buildPracticeQuestions(words: Word[], corpus: Word[], random: () => number = Math.random): PracticeQuestion[] {
  const validCorpus = cleanWords(corpus);
  return words.map((word, index) => {
    const options = meaningOptions(word, validCorpus, random);
    // An English cue shared by different target words cannot fairly test exact spelling.
    const cueMeanings = new Set(meanings(word.translation));
    const ambiguousCue = validCorpus.some((candidate) => meanings(candidate.translation).some((meaning) => cueMeanings.has(meaning))
      && normalizeAnswer(candidate.word) !== normalizeAnswer(word.word));
    return { word, mode: (index % 2 === 0 || ambiguousCue) && options.length >= 2 ? 'meaning' : 'typing', options, retry: false };
  });
}

/** A missed or assisted first attempt gets one later retrieval, never an endless loop. */
export function appendRetry(queue: PracticeQuestion[], index: number): PracticeQuestion[] {
  const question = queue[index];
  if (!question || question.retry || queue.some((item) => item.retry && item.word.rank === question.word.rank)) return queue;
  return [...queue, { ...question, retry: true }];
}
