import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyProgress, loadAccount, normalizeProgress, normalizeWordPerformance, saveAccountProgress, saveAccountWords } from '../accountStorage';
import { createWordPerformance } from '../persistence';

let storage: Record<string, string>;
beforeEach(() => {
  storage = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => { storage[key] = value; },
  });
});

describe('account storage', () => {
  it('keeps progress and word history isolated between accounts', () => {
    const progress = emptyProgress();
    progress.spanish.reading['1-1'] = { completed: true };
    saveAccountProgress('alice', progress);
    saveAccountWords('alice', { 'spanish-1': createWordPerformance(1, 'la', 'the', 'spanish') });
    expect(loadAccount('bob').progress.spanish.reading).toEqual({});
    expect(loadAccount('bob').wordPerformance).toEqual({});
    expect(loadAccount('alice').progress.spanish.reading['1-1'].completed).toBe(true);
    expect(loadAccount('alice').wordPerformance['spanish-1'].word).toBe('la');
  });

  it('preserves legacy data but migrates it only into the first account', () => {
    const progress = emptyProgress();
    progress.french.reading['1-1'] = { completed: true };
    storage.lingoforge_progress = JSON.stringify(progress);
    expect(loadAccount('alice').progress.french.reading['1-1']).toBeDefined();
    expect(loadAccount('bob').progress.french.reading).toEqual({});
    expect(storage.lingoforge_progress).toBe(JSON.stringify(progress));
  });

  it('does not overwrite newer scoped data with legacy data on subsequent loads', () => {
    storage.lingoforge_progress = JSON.stringify(emptyProgress());
    const first = loadAccount('alice');
    first.progress.dutch.reading['1-1'] = { completed: true };
    saveAccountProgress('alice', first.progress);
    expect(loadAccount('alice').progress.dutch.reading['1-1']).toBeDefined();
  });

  it('survives unavailable storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('disabled'); }, setItem: () => { throw new Error('disabled'); } });
    expect(loadAccount('alice')).toEqual({ progress: emptyProgress(), wordPerformance: {} });
    expect(saveAccountProgress('alice', emptyProgress())).toBe(false);
  });

  it('recovers from parseable but invalid stored data', () => {
    expect(normalizeProgress(null)).toEqual(emptyProgress());
    expect(normalizeProgress({ spanish: { reading: { '999-1': { completed: true }, '1-1': null } } })).toEqual(emptyProgress());
    expect(normalizeWordPerformance({ 'spanish-1': null, 'french-2': { language: 'french' } })).toEqual({});
    expect(normalizeWordPerformance([])).toEqual({});
  });
});
