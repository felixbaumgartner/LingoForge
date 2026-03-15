import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { ProgressMap } from '../types/progress';
import type { FlashcardData } from '../types/progress';

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
