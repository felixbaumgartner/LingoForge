import { create } from 'zustand';
import type { Language } from '../types/language';
import type { ProgressMap, LessonProgress, WordPerformanceMap } from '../types/progress';
import type { LessonType } from '../types/lesson';
import { recordWordResult, recordWordRating } from '../lib/persistence';
import { emptyProgress, loadAccount, saveAccountProgress, saveAccountWords } from '../lib/accountStorage';
import {
  loadProgressFromFirestore, loadWordPerfFromFirestore,
  saveProgressToFirestore, saveWordPerfToFirestore, mergeProgress, mergeWordPerformance,
} from '../lib/progressSync';

interface AppState {
  language: Language;
  progress: ProgressMap;
  wordPerformance: WordPerformanceMap;
  uid: string | null;
  sessionId: number;
  hydrated: boolean;
  syncStatus: 'loading' | 'saved' | 'local' | 'error';
  syncError: string | null;
  setLanguage: (lang: Language) => void;
  setUid: (uid: string | null) => void;
  hydrateAccount: (uid: string) => Promise<void>;
  retrySync: () => Promise<void>;
  setProgress: (progress: ProgressMap) => void;
  setWordPerformance: (wp: WordPerformanceMap) => void;
  completeLesson: (language: Language, type: LessonType, level: number, lesson: number, score?: number) => void;
  recordWord: (language: Language, rank: number, word: string, translation: string, correct: boolean) => void;
  rateWord: (language: Language, rank: number, word: string, translation: string, rating: 'hard' | 'moderate' | 'easy') => void;
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Sync timed out')), 8000);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export const useAppStore = create<AppState>((set, get) => {
  let hydrationRequest = 0;
  let pendingWrites = 0;
  let failedWrite = false;

  async function sync(progress?: ProgressMap, words?: WordPerformanceMap) {
    const { uid, sessionId } = get();
    if (!uid) return;
    pendingWrites++;
    set({ syncStatus: 'loading' });
    try {
      await withTimeout(Promise.all([
        ...(progress ? [saveProgressToFirestore(uid, progress)] : []),
        ...(words ? [saveWordPerfToFirestore(uid, words)] : []),
      ]));
    } catch {
      if (get().sessionId !== sessionId) return;
      failedWrite = true;
      set({ syncError: 'Cloud sync is unavailable. Your progress is kept on this device when browser storage is available.' });
    } finally {
      if (get().sessionId === sessionId) {
        pendingWrites--;
        if (pendingWrites === 0) set({ syncStatus: failedWrite ? 'error' : 'saved' });
      }
    }
  }

  function cache(progress?: ProgressMap, words?: WordPerformanceMap) {
    const { uid } = get();
    if (!uid) return;
    const progressSaved = !progress || saveAccountProgress(uid, progress);
    const wordsSaved = !words || saveAccountWords(uid, words);
    const saved = progressSaved && wordsSaved;
    if (!saved) set({ syncError: 'Browser storage is unavailable. Keep this page open until cloud sync completes.' });
  }

  return {
    language: 'spanish',
    progress: emptyProgress(),
    wordPerformance: {},
    uid: null,
    sessionId: 0,
    hydrated: false,
    syncStatus: 'local',
    syncError: null,

    setLanguage: (language) => set({ language }),

    setUid: (uid) => {
      if (get().uid === uid) return;
      hydrationRequest++;
      pendingWrites = 0;
      failedWrite = false;
      set({
        uid,
        sessionId: get().sessionId + 1,
        ...(uid ? loadAccount(uid) : { progress: emptyProgress(), wordPerformance: {} }),
        hydrated: false,
        syncStatus: uid ? 'loading' : 'local',
        syncError: null,
      });
    },

    hydrateAccount: async (uid) => {
      if (get().uid !== uid) return;
      const { sessionId } = get();
      const request = ++hydrationRequest;
      set({ syncStatus: 'loading', syncError: null });
      try {
        const [remoteProgress, remoteWords] = await withTimeout(Promise.all([
          loadProgressFromFirestore(uid), loadWordPerfFromFirestore(uid),
        ]));
        if (get().sessionId !== sessionId || request !== hydrationRequest) return;
        const progress = mergeProgress(get().progress, remoteProgress ?? emptyProgress());
        const wordPerformance = mergeWordPerformance(get().wordPerformance, remoteWords ?? {});
        cache(progress, wordPerformance);
        set({ progress, wordPerformance, hydrated: true });
        failedWrite = false;
        await sync(progress, wordPerformance);
      } catch {
        if (get().sessionId !== sessionId || request !== hydrationRequest) return;
        failedWrite = true;
        set({ hydrated: true, syncStatus: 'error', syncError: 'Cloud sync is unavailable. You can continue using the progress saved on this device.' });
      }
    },

    retrySync: async () => {
      const { uid } = get();
      if (uid) await get().hydrateAccount(uid);
    },

    setProgress: (progress) => {
      cache(progress);
      set({ progress });
    },

    setWordPerformance: (wordPerformance) => {
      cache(undefined, wordPerformance);
      set({ wordPerformance });
    },

    completeLesson: (language, type, level, lesson, score) => {
      const state = get();
      const key = `${level}-${lesson}`;
      const previous = state.progress[language][type][key];
      const scores = [previous?.score, score].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
      const entry: LessonProgress = {
        completed: true,
        ...(scores.length ? { score: Math.max(...scores) } : {}),
        completedAt: new Date().toISOString(),
      };
      const progress = {
        ...state.progress,
        [language]: {
          ...state.progress[language],
          [type]: { ...state.progress[language][type], [key]: entry },
        },
      };
      cache(progress);
      set({ progress });
      void sync(progress);
    },

    recordWord: (language, rank, word, translation, correct) => {
      const wordPerformance = recordWordResult(get().wordPerformance, language, rank, word, translation, correct);
      cache(undefined, wordPerformance);
      set({ wordPerformance });
      void sync(undefined, wordPerformance);
    },

    rateWord: (language, rank, word, translation, rating) => {
      const wordPerformance = recordWordRating(get().wordPerformance, language, rank, word, translation, rating);
      cache(undefined, wordPerformance);
      set({ wordPerformance });
      void sync(undefined, wordPerformance);
    },
  };
});
