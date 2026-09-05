import { create } from 'zustand';
import type { Language } from '../types/language';
import type { ProgressMap, LessonProgress, WordPerformanceMap } from '../types/progress';
import type { LessonType } from '../types/lesson';
import type { LearningAttempt, LearningJournal, MissionCompletion } from '../types/mission';
import { addLearningAttempt, addMissionCompletion, emptyLearningJournal, loadAccountLearningJournal, mergeLearningJournals, saveAccountLearningJournal } from '../lib/learningJournal';
import { loadLearningJournalFromFirestore, saveLearningJournalToFirestore } from '../lib/learningJournalSync';
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
  learningJournal: LearningJournal;
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
  recordLearningAttempt: (attempt: LearningAttempt) => void;
  completeMission: (completion: MissionCompletion) => void;
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

  async function sync(progress?: ProgressMap, words?: WordPerformanceMap, journal?: LearningJournal) {
    const { uid, sessionId } = get();
    if (!uid) return;
    pendingWrites++;
    set({ syncStatus: 'loading' });
    try {
      await withTimeout(Promise.all([
        ...(progress ? [saveProgressToFirestore(uid, progress)] : []),
        ...(words ? [saveWordPerfToFirestore(uid, words)] : []),
        ...(journal ? [saveLearningJournalToFirestore(uid, journal)] : []),
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

  function cache(progress?: ProgressMap, words?: WordPerformanceMap, journal?: LearningJournal) {
    const { uid } = get();
    if (!uid) return;
    const progressSaved = !progress || saveAccountProgress(uid, progress);
    const wordsSaved = !words || saveAccountWords(uid, words);
    const journalSaved = !journal || saveAccountLearningJournal(uid, journal);
    const saved = progressSaved && wordsSaved && journalSaved;
    if (!saved) set({ syncError: 'Browser storage is unavailable. Keep this page open until cloud sync completes.' });
  }

  return {
    language: 'spanish',
    progress: emptyProgress(),
    wordPerformance: {},
    learningJournal: emptyLearningJournal(),
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
        learningJournal: uid ? loadAccountLearningJournal(uid) : emptyLearningJournal(),
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
        // A newly introduced document may have different rules or availability.
        // Read each independently so journal failure cannot hide legacy progress.
        const [progressLoad, wordsLoad, journalLoad] = await Promise.allSettled([
          withTimeout(loadProgressFromFirestore(uid)), withTimeout(loadWordPerfFromFirestore(uid)),
          withTimeout(loadLearningJournalFromFirestore(uid)),
        ]);
        if (get().sessionId !== sessionId || request !== hydrationRequest) return;
        const progress = mergeProgress(get().progress, progressLoad.status === 'fulfilled' ? progressLoad.value ?? emptyProgress() : emptyProgress());
        const wordPerformance = mergeWordPerformance(get().wordPerformance, wordsLoad.status === 'fulfilled' ? wordsLoad.value ?? {} : {});
        const learningJournal = mergeLearningJournals(get().learningJournal, journalLoad.status === 'fulfilled' ? journalLoad.value : emptyLearningJournal());
        cache(progress, wordPerformance, learningJournal);
        set({ progress, wordPerformance, learningJournal, hydrated: true });
        failedWrite = [progressLoad, wordsLoad, journalLoad].some((result) => result.status === 'rejected');
        if (failedWrite) set({ syncError: 'Some cloud progress is unavailable. You can continue using the progress saved on this device.' });
        // Do not create a new empty journal on every existing user's login.
        const hasEvents = Object.keys(learningJournal.attempts).length > 0 || Object.keys(learningJournal.completions).length > 0;
        await sync(progressLoad.status === 'fulfilled' ? progress : undefined, wordsLoad.status === 'fulfilled' ? wordPerformance : undefined,
          journalLoad.status === 'fulfilled' && hasEvents ? learningJournal : undefined);
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

    recordLearningAttempt: (attempt) => {
      const previous = get().learningJournal;
      const learningJournal = addLearningAttempt(previous, attempt);
      if (learningJournal === previous) return;
      cache(undefined, undefined, learningJournal);
      set({ learningJournal });
      void sync(undefined, undefined, learningJournal);
    },

    completeMission: (completion) => {
      const previous = get().learningJournal;
      const learningJournal = addMissionCompletion(previous, completion);
      if (learningJournal === previous) return;
      cache(undefined, undefined, learningJournal);
      set({ learningJournal });
      void sync(undefined, undefined, learningJournal);
    },
  };
});
