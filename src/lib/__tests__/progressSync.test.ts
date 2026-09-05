import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyProgress } from '../accountStorage';
import { createWordPerformance } from '../persistence';

const firestore = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  runTransaction: (_db: unknown, callback: (transaction: unknown) => Promise<void>) => callback({ get: firestore.read, set: firestore.write }),
}));
import { saveProgressToFirestore, saveWordPerfToFirestore, mergeWordPerformance } from '../progressSync';

beforeEach(() => vi.clearAllMocks());

describe('transactional cloud saves', () => {
  it('preserves another device’s completed lesson when saving a stale local snapshot', async () => {
    const local = emptyProgress();
    local.spanish.reading['1-1'] = { completed: true };
    const remote = emptyProgress();
    remote.french.reading['1-1'] = { completed: true, score: 100 };
    firestore.read.mockResolvedValue({ data: () => remote });
    await saveProgressToFirestore('alice', local);
    expect(firestore.write).toHaveBeenCalledWith('users/alice/data/progress', expect.objectContaining({
      spanish: local.spanish, french: remote.french,
    }));
  });

  it('retains remote words and newer scheduling during a local word save', async () => {
    const localWord = { ...createWordPerformance(1, 'la', 'the', 'spanish'), lastSeen: '2026-01-01T00:00:00Z', timesCorrect: 2, reviewCount: 2 };
    const remoteWord = { ...localWord, lastSeen: '2026-02-01T00:00:00Z', nextReview: '2026-02-08T00:00:00Z', timesCorrect: 3, reviewCount: 3 };
    const otherWord = createWordPerformance(2, 'el', 'the', 'spanish');
    firestore.read.mockResolvedValue({ data: () => ({ 'spanish-1': remoteWord, 'spanish-2': otherWord }) });
    await saveWordPerfToFirestore('alice', { 'spanish-1': localWord });
    expect(firestore.write).toHaveBeenCalledWith('users/alice/data/wordPerformance', {
      'spanish-1': remoteWord, 'spanish-2': otherWord,
    });
  });

  it('does not double-count repeated merges of the same synced history', () => {
    const word = { ...createWordPerformance(1, 'la', 'the', 'spanish'), timesCorrect: 3, reviewCount: 3 };
    const map = { 'spanish-1': word };
    expect(mergeWordPerformance(mergeWordPerformance(map, map), map)).toEqual(map);
  });
});
