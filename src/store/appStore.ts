import { create } from 'zustand';
import type { Language } from '../types/language';
import type { ProgressMap, LessonProgress } from '../types/progress';
import type { LessonType } from '../types/lesson';
import { loadProgress, saveProgress } from '../lib/persistence';
import { saveProgressToFirestore } from '../lib/progressSync';

interface AppState {
  language: Language;
  progress: ProgressMap;
  uid: string | null;
  setLanguage: (lang: Language) => void;
  setUid: (uid: string | null) => void;
  setProgress: (progress: ProgressMap) => void;
  completeLesson: (language: Language, type: LessonType, level: number, lesson: number, score?: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  language: 'spanish',
  progress: loadProgress(),
  uid: null,

  setLanguage: (lang) => set({ language: lang }),

  setUid: (uid) => set({ uid }),

  setProgress: (progress) => {
    saveProgress(progress);
    set({ progress });
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

    // Save to localStorage
    saveProgress(newProgress);

    // Save to Firestore if logged in
    if (state.uid) {
      saveProgressToFirestore(state.uid, newProgress).catch(console.error);
    }

    set({ progress: newProgress });
  },
}));
