import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addLearningAttempt, emptyLearningJournal } from '../learningJournal';
import type { LearningAttempt } from '../../types/mission';

const firestore = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), getDoc: vi.fn() }));
vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  getDoc: firestore.getDoc,
  runTransaction: (_db: unknown, callback: (transaction: unknown) => Promise<void>) => callback({ get: firestore.read, set: firestore.write }),
}));
import { loadLearningJournalFromFirestore, saveLearningJournalToFirestore } from '../learningJournalSync';
beforeEach(() => vi.clearAllMocks());
const event: LearningAttempt = { id: 'local', sessionId: 'session', missionId: 'spanish-cafe', language: 'spanish', phraseId: 'coffee', concept: 'requests', ability: 'recall', evidence: 'objective', correct: true, assisted: false, phase: 'practice', createdAt: '2026-01-01T00:00:00Z' };

describe('journal cloud transactions', () => {
  it('unions device events instead of overwriting a newer remote journal', async () => {
    const local = addLearningAttempt(emptyLearningJournal(), event);
    const remote = addLearningAttempt(emptyLearningJournal(), { ...event, id: 'remote' });
    firestore.read.mockResolvedValue({ data: () => remote });
    await saveLearningJournalToFirestore('alice', local);
    expect(firestore.write).toHaveBeenCalledWith('users/alice/data/learningJournal', expect.objectContaining({ attempts: { ...local.attempts, ...remote.attempts } }));
    const merged = firestore.write.mock.calls[0][1];
    firestore.read.mockResolvedValue({ data: () => merged });
    await saveLearningJournalToFirestore('alice', local);
    expect(firestore.write.mock.calls[1][1]).toEqual(merged);
  });

  it('validates cloud reads and leaves network errors visible to the account sync layer', async () => {
    firestore.getDoc.mockResolvedValue({ data: () => ({ version: 1, attempts: { local: { ...event, correct: 'yes' } } }) });
    expect(await loadLearningJournalFromFirestore('alice')).toEqual(emptyLearningJournal());
    firestore.getDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(loadLearningJournalFromFirestore('alice')).rejects.toThrow('permission-denied');
  });
});
