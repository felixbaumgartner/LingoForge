export type LessonType = 'reading' | 'writing' | 'speaking';

export interface CorpusWord {
  rank: number;
  word: string;
  translation: string;
}

export interface ReadingLesson {
  language: string;
  type: 'reading';
  level: number;
  wordRange: [number, number];
  corpusWords?: CorpusWord[];
  title: string;
  passage: string;
  passageTranslation: string;
  vocabulary: {
    word: string;
    translation: string;
    exampleSentence: string;
    exampleTranslation: string;
  }[];
  questions: {
    question: string;
    options: string[];
    correctIndex: number;
  }[];
}

export interface WritingExercise {
  type: 'fill-in-blank' | 'translation' | 'word-order' | 'multiple-choice';
  instruction: string;
  sentence?: string;
  word?: string;
  words?: string[];
  answer: string;
  hint?: string;
  options?: string[];
  correctIndex?: number;
}

export interface WritingLesson {
  language: string;
  type: 'writing';
  level: number;
  wordRange: [number, number];
  corpusWords?: CorpusWord[];
  title: string;
  exercises: WritingExercise[];
}

export interface SpeakingLesson {
  language: string;
  type: 'speaking';
  level: number;
  wordRange: [number, number];
  corpusWords?: CorpusWord[];
  title: string;
  pronunciationCards: {
    word: string;
    translation: string;
    phoneticHint: string;
  }[];
  phrases: {
    phrase: string;
    translation: string;
    context: string;
  }[];
  dialogue: {
    speaker: string;
    line: string;
    translation: string;
  }[];
}

export type Lesson = ReadingLesson | WritingLesson | SpeakingLesson;
