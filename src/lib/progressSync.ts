import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import type { ProgressMap, FlashcardData, WordPerformanceMap } from '../types/progress';
import { normalizeProgress, normalizeWordPerformance } from './accountStorage';

export async function loadProgressFromFirestore(uid: string): Promise<ProgressMap | null> {
  const ref = doc(db, 'users', uid, 'data', 'progress');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return normalizeProgress(snap.data());
  }
  return null;
}

export async function saveProgressToFirestore(uid: string, progress: ProgressMap): Promise<void> {
  const ref = doc(db, 'users', uid, 'data', 'progress');
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    transaction.set(ref, mergeProgress(progress, normalizeProgress(snapshot.data())));
  });
}

// Legacy flashcard functions (kept for migration)
export async function loadFlashcardsFromFirestore(uid: string): Promise<FlashcardData[]> {
  const ref = doc(db, 'users', uid, 'data', 'flashcards');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return (snap.data().cards ?? []) as FlashcardData[];
  }
  return [];
}

export async function saveFlashcardsToFirestore(uid: string, cards: FlashcardData[]): Promise<void> {
  const ref = doc(db, 'users', uid, 'data', 'flashcards');
  await setDoc(ref, { cards });
}

// --- Word Performance sync ---

export async function loadWordPerfFromFirestore(uid: string): Promise<WordPerformanceMap | null> {
  const ref = doc(db, 'users', uid, 'data', 'wordPerformance');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return normalizeWordPerformance(snap.data());
  }
  return null;
}

export async function saveWordPerfToFirestore(uid: string, data: WordPerformanceMap): Promise<void> {
  const ref = doc(db, 'users', uid, 'data', 'wordPerformance');
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    transaction.set(ref, mergeWordPerformance(data, normalizeWordPerformance(snapshot.data())));
  });
}

/** Merge snapshots without counting the same synced attempts twice. */
export function mergeWordPerformance(local: WordPerformanceMap, remote: WordPerformanceMap): WordPerformanceMap {
  const result = { ...local };
  for (const [key, remoteWp] of Object.entries(remote)) {
    const localWp = result[key];
    if (!localWp) {
      result[key] = remoteWp;
      continue;
    }
    // Keep the record with more recent activity, merge counts
    if (Date.parse(remoteWp.lastSeen) > Date.parse(localWp.lastSeen)) {
      result[key] = {
        ...remoteWp,
        timesCorrect: Math.max(localWp.timesCorrect, remoteWp.timesCorrect),
        timesIncorrect: Math.max(localWp.timesIncorrect, remoteWp.timesIncorrect),
        reviewCount: Math.max(localWp.reviewCount, remoteWp.reviewCount),
      };
    } else {
      result[key] = {
        ...localWp,
        timesCorrect: Math.max(localWp.timesCorrect, remoteWp.timesCorrect),
        timesIncorrect: Math.max(localWp.timesIncorrect, remoteWp.timesIncorrect),
        reviewCount: Math.max(localWp.reviewCount, remoteWp.reviewCount),
      };
    }
  }
  return result;
}

/** Preserve completed lessons and the best score, without mutating either snapshot. */
export function mergeProgress(local: ProgressMap, remote: ProgressMap): ProgressMap {
  const result = normalizeProgress(local);
  const incoming = normalizeProgress(remote);
  for (const language of ['spanish', 'french', 'dutch'] as const) {
    for (const type of ['reading', 'writing', 'speaking'] as const) {
      for (const [key, remoteEntry] of Object.entries(incoming[language][type])) {
        const localEntry = result[language][type][key];
        if (!localEntry) {
          result[language][type][key] = { ...remoteEntry };
          continue;
        }
        const dates = [localEntry.completedAt, remoteEntry.completedAt].filter((date): date is string => Boolean(date));
        const scores = [localEntry.score, remoteEntry.score].filter((score): score is number => typeof score === 'number');
        result[language][type][key] = {
          completed: true,
          ...(scores.length ? { score: Math.max(...scores) } : {}),
          ...(dates.length ? { completedAt: dates.sort((a, b) => Date.parse(b) - Date.parse(a))[0] } : {}),
        };
      }
    }
  }
  return result;
}
