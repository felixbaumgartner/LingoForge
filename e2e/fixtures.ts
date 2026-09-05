import type { Word } from '../src/types/language';
import type { Lesson } from '../src/types/lesson';
import type { WordPerformanceMap } from '../src/types/progress';
import { emptyProgress } from '../src/lib/accountStorage';
import { createWordPerformance } from '../src/lib/persistence';

export const words: Word[] = [
  { rank: 1, word: 'casa', translation: 'house' },
  { rank: 2, word: 'agua', translation: 'water' },
  { rank: 3, word: 'gato', translation: 'cat' },
  { rank: 4, word: 'perro', translation: 'dog' },
  { rank: 5, word: 'café', translation: 'coffee' },
  { rank: 6, word: 'libro', translation: 'book' },
  { rank: 7, word: 'mesa', translation: 'table' },
  { rank: 8, word: 'sol', translation: 'sun' },
  { rank: 9, word: 'luna', translation: 'moon' },
  { rank: 10, word: 'pan', translation: 'bread' },
];

export function lessonFixture(type: Lesson['type'], lesson = 1): Lesson {
  const base = { language: 'spanish' as const, level: 1, lesson, wordRange: [1, 10] as [number, number], corpusWords: words, title: `${type[0].toUpperCase()}${type.slice(1)} fixture ${lesson}` };
  if (type === 'writing') return { ...base, type, exercises: [
    { type: 'translation', instruction: 'Translate house', sentence: 'house', answer: 'casa', corpusRank: 1, explanation: 'Casa means house.' },
    { type: 'translation', instruction: 'Translate water', sentence: 'water', answer: 'agua', corpusRank: 2, explanation: 'Agua means water.' },
  ] };
  if (type === 'speaking') return { ...base, type,
    pronunciationCards: words.map((word) => ({ ...word, phoneticHint: 'Say it aloud' })),
    phrases: [{ phrase: 'Mi casa', translation: 'My house', context: 'Talking about home' }],
    dialogue: [{ speaker: 'A', line: 'Mi casa', translation: 'My house' }],
  };
  return { ...base, type,
    passage: 'Mi casa tiene agua.', passageTranslation: 'My house has water.',
    vocabulary: words.map((word) => ({ word: word.word, translation: word.translation, exampleSentence: word.word, exampleTranslation: word.translation })),
    questions: [{ question: 'What does the house have?', options: ['Water', 'Coffee'], correctIndex: 0, explanation: 'Agua means water.' }],
  };
}

export function stateFixture(scenario: string) {
  const progress = emptyProgress();
  if (scenario === 'review') progress.spanish.reading['1-1'] = { completed: true };
  const wordPerformance: WordPerformanceMap = scenario === 'vocabulary' ? {
    'spanish-1': { ...createWordPerformance(1, 'casa', 'house', 'spanish'), timesIncorrect: 2, reviewCount: 2, lastSeen: '2026-01-01T00:00:00Z', nextReview: '2026-01-02T00:00:00Z' },
    'spanish-5': { ...createWordPerformance(5, 'café', 'coffee', 'spanish'), timesCorrect: 3, reviewCount: 3, streak: 3, nextReview: '2099-01-01T00:00:00Z' },
  } : {};
  return { progress, wordPerformance };
}
