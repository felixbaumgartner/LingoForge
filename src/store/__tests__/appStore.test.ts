import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressMap } from '../../types/progress';
import { emptyProgress, loadAccount, saveAccountProgress } from '../../lib/accountStorage';

const cloud = vi.hoisted(() => ({
  loadProgress: vi.fn(), loadWords: vi.fn(), saveProgress: vi.fn(), saveWords: vi.fn(),
}));
vi.mock('../../lib/firebase', () => ({ db: {} }));
vi.mock('../../lib/progressSync', async (original) => ({
  ...await original<typeof import('../../lib/progressSync')>(),
  loadProgressFromFirestore: cloud.loadProgress,
  loadWordPerfFromFirestore: cloud.loadWords,
  saveProgressToFirestore: cloud.saveProgress,
  saveWordPerfToFirestore: cloud.saveWords,
}));
import { useAppStore } from '../appStore';
import { mergeProgress } from '../../lib/progressSync';

beforeEach(() => {
  const storage: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => { storage[key] = value; },
  });
  useAppStore.getState().setUid(null);
  vi.clearAllMocks();
  cloud.loadProgress.mockResolvedValue(null);
  cloud.loadWords.mockResolvedValue(null);
  cloud.saveProgress.mockResolvedValue(undefined);
  cloud.saveWords.mockResolvedValue(undefined);
});

describe('account lifecycle', () => {
  it('clears personal state on logout and restores only the selected account', () => {
    const progress = emptyProgress();
    progress.spanish.reading['1-1'] = { completed: true };
    saveAccountProgress('alice', progress);
    useAppStore.getState().setUid('alice');
    expect(useAppStore.getState().progress.spanish.reading['1-1']).toBeDefined();
    useAppStore.getState().setUid(null);
    expect(useAppStore.getState().progress).toEqual(emptyProgress());
    useAppStore.getState().setUid('bob');
    expect(useAppStore.getState().progress).toEqual(emptyProgress());
    useAppStore.getState().setUid('alice');
    expect(useAppStore.getState().progress.spanish.reading['1-1']).toBeDefined();
  });

  it('ignores a late cloud response after switching accounts', async () => {
    let resolveAlice!: (value: ProgressMap) => void;
    cloud.loadProgress.mockImplementationOnce(() => new Promise<ProgressMap>((resolve) => { resolveAlice = resolve; }));
    useAppStore.getState().setUid('alice');
    const aliceLoad = useAppStore.getState().hydrateAccount('alice');
    useAppStore.getState().setUid('bob');
    await useAppStore.getState().hydrateAccount('bob');
    const aliceProgress = emptyProgress();
    aliceProgress.french.reading['1-1'] = { completed: true };
    resolveAlice(aliceProgress);
    await aliceLoad;
    expect(useAppStore.getState().uid).toBe('bob');
    expect(useAppStore.getState().progress).toEqual(emptyProgress());
    expect(loadAccount('bob').progress).toEqual(emptyProgress());
    expect(cloud.saveProgress.mock.calls.every(([uid]) => uid === 'bob')).toBe(true);
  });

  it('allows learning from the local cache when cloud loading fails', async () => {
    cloud.loadProgress.mockRejectedValue(new Error('offline'));
    useAppStore.getState().setUid('alice');
    await useAppStore.getState().hydrateAccount('alice');
    expect(useAppStore.getState().hydrated).toBe(true);
    expect(useAppStore.getState().syncStatus).toBe('error');
    expect(useAppStore.getState().syncError).toContain('continue');
  });

  it('saves scoreless completions without undefined values and without mutating prior state', async () => {
    useAppStore.getState().setUid('alice');
    const previous = useAppStore.getState().progress;
    Object.freeze(previous.spanish.reading);
    Object.freeze(previous.spanish);
    useAppStore.getState().completeLesson('spanish', 'reading', 1, 1);
    await vi.waitFor(() => expect(useAppStore.getState().syncStatus).toBe('saved'));
    const entry = useAppStore.getState().progress.spanish.reading['1-1'];
    expect(Object.hasOwn(entry, 'score')).toBe(false);
    expect(previous.spanish.reading).toEqual({});
    expect(cloud.saveProgress).toHaveBeenCalledWith('alice', useAppStore.getState().progress);
  });

  it('keeps the best score after a lower-scoring replay', async () => {
    useAppStore.getState().setUid('alice');
    useAppStore.getState().completeLesson('spanish', 'reading', 1, 1, 90);
    useAppStore.getState().completeLesson('spanish', 'reading', 1, 1, 40);
    await vi.waitFor(() => expect(useAppStore.getState().syncStatus).toBe('saved'));
    expect(useAppStore.getState().progress.spanish.reading['1-1'].score).toBe(90);
  });
});

describe('progress merge', () => {
  it('retains completions from both devices, best scores and latest completion without mutation', () => {
    const local = emptyProgress();
    const remote = emptyProgress();
    local.spanish.reading['1-1'] = { completed: true, score: 90, completedAt: '2026-01-01T00:00:00Z' };
    remote.spanish.reading['1-1'] = { completed: true, score: 50, completedAt: '2026-02-01T00:00:00Z' };
    remote.spanish.reading['1-2'] = { completed: true };
    const result = mergeProgress(local, remote);
    expect(result.spanish.reading['1-1']).toEqual({ completed: true, score: 90, completedAt: '2026-02-01T00:00:00Z' });
    expect(result.spanish.reading['1-2']).toEqual({ completed: true });
    expect(local.spanish.reading['1-2']).toBeUndefined();
    expect(remote.spanish.reading['1-1'].score).toBe(50);
  });
});
