import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import type { LearningJournal } from '../types/mission';
import { mergeLearningJournals, normalizeLearningJournal } from './learningJournal';

export async function loadLearningJournalFromFirestore(uid: string): Promise<LearningJournal> {
  const snapshot = await getDoc(doc(db, 'users', uid, 'data', 'learningJournal'));
  return normalizeLearningJournal(snapshot.data());
}

export async function saveLearningJournalToFirestore(uid: string, journal: LearningJournal): Promise<void> {
  const ref = doc(db, 'users', uid, 'data', 'learningJournal');
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    transaction.set(ref, mergeLearningJournals(journal, normalizeLearningJournal(snapshot.data())));
  });
}
