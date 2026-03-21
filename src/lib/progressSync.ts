import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { ProgressMap, FlashcardData, WordPerformanceMap } from '../types/progress';

export async function loadProgressFromFirestore(uid: string): Promise<ProgressMap | null> {
  const ref = doc(db, 'users', uid, 'data', 'progress');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as ProgressMap;
  }
  return null;
}

export async function saveProgressToFirestore(uid: string, progress: ProgressMap): Promise<void> {
  const ref = doc(db, 'users', uid, 'data', 'progress');
  await setDoc(ref, progress);
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
    return snap.data() as WordPerformanceMap;
  }
  return null;
}

export async function saveWordPerfToFirestore(uid: string, data: WordPerformanceMap): Promise<void> {
  const ref = doc(db, 'users', uid, 'data', 'wordPerformance');
  await setDoc(ref, data);
}

/** Merge local and remote WordPerformanceMap — most recent lastSeen wins, counts are additive */
export function mergeWordPerformance(local: WordPerformanceMap, remote: WordPerformanceMap): WordPerformanceMap {
  const result = { ...local };
  for (const [key, remoteWp] of Object.entries(remote)) {
    const localWp = result[key];
    if (!localWp) {
      result[key] = remoteWp;
      continue;
    }
    // Keep the record with more recent activity, merge counts
    if (remoteWp.lastSeen > localWp.lastSeen) {
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
