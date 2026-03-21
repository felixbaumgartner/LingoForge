import { create } from 'zustand';
import type { Language } from '../types/language';
import type { ProgressMap, LessonProgress, WordPerformanceMap } from '../types/progress';
import type { LessonType } from '../types/lesson';
import { loadProgress, saveProgress, loadWordPerformance, saveWordPerformance, recordWordResult, recordWordRating } from '../lib/persistence';
import { saveProgressToFirestore, saveWordPerfToFirestore } from '../lib/progressSync';

interface AppState {
  language: Language;
  progress: ProgressMap;
  wordPerformance: WordPerformanceMap;
  uid: string | null;
  setLanguage: (lang: Language) => void;
  setUid: (uid: string | null) => void;
  setProgress: (progress: ProgressMap) => void;
  setWordPerformance: (wp: WordPerformanceMap) => void;
  completeLesson: (language: Language, type: LessonType, level: number, lesson: number, score?: number) => void;
  recordWord: (language: Language, rank: number, word: string, translation: string, correct: boolean) => void;
  rateWord: (language: Language, rank: number, word: string, translation: string, rating: 'hard' | 'moderate' | 'easy') => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  language: 'spanish',
  progress: loadProgress(),
  wordPerformance: loadWordPerformance(),
  uid: null,

  setLanguage: (lang) => set({ language: lang }),

  setUid: (uid) => set({ uid }),

  setProgress: (progress) => {
    saveProgress(progress);
    set({ progress });
  },

  setWordPerformance: (wp) => {
    saveWordPerformance(wp);
    set({ wordPerformance: wp });
  },

  completeLesson: (language, type, level, lesson, score) => {
    const state = get();
    const newProgress = { ...state.progress };
    if (!newProgress[language]) {
      newProgress[language] = { reading: {}, writing: {}, speaking: {} };
    }
    if (!newProgress[language][type]) {
      newProgress[language][type] = {};
    }
    const entry: LessonProgress = {
      completed: true,
      score,
      completedAt: new Date().toISOString(),
    };
    const key = `${level}-${lesson}`;
    newProgress[language][type] = {
      ...newProgress[language][type],
      [key]: entry,
    };

    saveProgress(newProgress);
    if (state.uid) {
      saveProgressToFirestore(state.uid, newProgress).catch(console.error);
    }
    set({ progress: newProgress });
  },

  recordWord: (language, rank, word, translation, correct) => {
    const state = get();
    const updated = recordWordResult(state.wordPerformance, language, rank, word, translation, correct);
    saveWordPerformance(updated);
    if (state.uid) {
      saveWordPerfToFirestore(state.uid, updated).catch(console.error);
    }
    set({ wordPerformance: updated });
  },

  rateWord: (language, rank, word, translation, rating) => {
    const state = get();
    const updated = recordWordRating(state.wordPerformance, language, rank, word, translation, rating);
    saveWordPerformance(updated);
    if (state.uid) {
      saveWordPerfToFirestore(state.uid, updated).catch(console.error);
    }
    set({ wordPerformance: updated });
  },
}));
