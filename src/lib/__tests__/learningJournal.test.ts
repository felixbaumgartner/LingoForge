import { describe, expect, it, vi } from 'vitest';
import type { LearningAttempt, MissionCompletion } from '../../types/mission';
import { addLearningAttempt, addMissionCompletion, emptyLearningJournal, getAbilityStats, getConceptWeaknesses, getMissionDue, getPhraseAbilityStats, getUnresolvedLearningMistakes, loadAccountLearningJournal, mergeLearningJournals, normalizeLearningJournal, saveAccountLearningJournal } from '../learningJournal';

const event = (overrides: Partial<LearningAttempt> = {}): LearningAttempt => ({
  id: 'event-1', sessionId: 'session-1', missionId: 'spanish-cafe', phraseId: 'coffee', language: 'spanish', concept: 'polite requests',
  ability: 'recall', evidence: 'objective', correct: false, assisted: false, phase: 'practice', createdAt: '2026-01-01T00:00:00Z', ...overrides,
});
const completed = (overrides: Partial<MissionCompletion> = {}): MissionCompletion => ({
  id: 'complete-1', missionId: 'spanish-cafe', language: 'spanish', phase: 'practice', completedAt: '2026-01-01T00:00:00Z', durationSeconds: 180, ...overrides,
});

describe('validated bounded event history', () => {
  it('is immutable and idempotent and strips unrecognized fields', () => {
    const original = emptyLearningJournal();
    Object.freeze(original.attempts);
    const next = addLearningAttempt(original, { ...event(), arbitrary: 'not stored' } as LearningAttempt);
    expect(original.attempts).toEqual({});
    expect(next.attempts['event-1']).not.toHaveProperty('arbitrary');
    expect(addLearningAttempt(next, event({ correct: true }))).toBe(next);
    const withCompletion = addMissionCompletion(next, completed());
    expect(addMissionCompletion(withCompletion, completed())).toBe(withCompletion);
  });

  it('rejects invalid fields, record keys and oversized event payloads', () => {
    for (const invalid of [{ ability: 'fluent' }, { language: 'german' }, { correct: 'yes' }, { createdAt: 'never' }, { id: '../bad' }, { id: '__proto__' }, { evidence: 'ai-score' }, { concept: '字'.repeat(100), missionId: 'm'.repeat(100), phraseId: 'p'.repeat(100) }]) {
      expect(addLearningAttempt(emptyLearningJournal(), event(invalid as Partial<LearningAttempt>)).attempts).toEqual({});
    }
    expect(normalizeLearningJournal({ version: 1, attempts: { wrong: event() } }).attempts).toEqual({});
    expect(addMissionCompletion(emptyLearningJournal(), completed({ durationSeconds: -1 })).completions).toEqual({});
    expect(normalizeLearningJournal({ version: 2 })).toEqual(emptyLearningJournal());
  });

  it('unions concurrent events and converges even if a duplicate ID has conflicting data', () => {
    const a = addLearningAttempt(emptyLearningJournal(), event());
    const b = addLearningAttempt(addLearningAttempt(emptyLearningJournal(), event({ id: 'event-2' })), event({ correct: true }));
    const merged = mergeLearningJournals(a, b);
    expect(Object.keys(merged.attempts)).toHaveLength(2);
    expect(mergeLearningJournals(b, a)).toEqual(merged);
    expect(mergeLearningJournals(merged, b)).toEqual(merged);
  });

  it('deterministically retains latest 1000 attempts and 300 completions including first practice', () => {
    const attempts = Object.fromEntries(Array.from({ length: 1100 }, (_, i) => {
      const item = event({ id: `a-${i}`, createdAt: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString() });
      return [item.id, item];
    }));
    const completions = Object.fromEntries(Array.from({ length: 400 }, (_, i) => {
      const item = completed({ id: `c-${i}`, phase: i ? 'transfer' : 'practice', completedAt: new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString() });
      return [item.id, item];
    }));
    const value = { version: 1, attempts, completions };
    const normalized = normalizeLearningJournal(value);
    expect(Object.keys(normalized.attempts)).toHaveLength(1000);
    expect(normalized.attempts['a-0']).toBeUndefined();
    expect(Object.keys(normalized.completions)).toHaveLength(300);
    expect(normalized.completions['c-0']).toBeDefined();
    expect(normalized.completions['c-399']).toBeDefined();
    expect(normalizeLearningJournal({ ...value, attempts: Object.fromEntries(Object.entries(attempts).reverse()) })).toEqual(normalized);
    expect(new TextEncoder().encode(JSON.stringify(normalized)).length).toBeLessThan(900000);
  });

  it('handles denied storage and isolates per-account caches', () => {
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage[key] ?? null, setItem: (key: string, value: string) => { storage[key] = value; } });
    const journal = addLearningAttempt(emptyLearningJournal(), event());
    expect(saveAccountLearningJournal('alice', journal)).toBe(true);
    expect(loadAccountLearningJournal('alice')).toEqual(journal);
    expect(loadAccountLearningJournal('bob')).toEqual(emptyLearningJournal());
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); } });
    expect(loadAccountLearningJournal('alice')).toEqual(emptyLearningJournal());
    expect(saveAccountLearningJournal('alice', journal)).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('evidence and mistake selectors', () => {
  it('separates objective unaided results from help and self-assessment per ability and phrase', () => {
    let journal = emptyLearningJournal();
    for (const item of [event({ correct: true }), event({ id: 'a2', correct: true, assisted: true }), event({ id: 'a3', correct: true, evidence: 'self-assessed', ability: 'use' }), event({ id: 'a4', phraseId: 'tea' }), event({ id: 'a5', language: 'french' })]) journal = addLearningAttempt(journal, item);
    expect(getAbilityStats(journal, 'spanish').recall).toEqual({ attempts: 2, correct: 1, assisted: 1, selfAssessed: 0 });
    expect(getAbilityStats(journal, 'spanish').use).toEqual({ attempts: 0, correct: 0, assisted: 0, selfAssessed: 1 });
    expect(getPhraseAbilityStats(journal, 'spanish', 'coffee').recall.attempts).toBe(1);
  });

  it('does not erase a mistake on same-session retries but resolves it with later unaided success', () => {
    let journal = addLearningAttempt(emptyLearningJournal(), event());
    journal = addLearningAttempt(journal, event({ id: 'retry', correct: true, createdAt: '2026-01-01T00:01:00Z' }));
    expect(getConceptWeaknesses(journal, 'spanish')[0].mistakes).toBe(1);
    journal = addLearningAttempt(journal, event({ id: 'help', sessionId: 'session-2', assisted: true, correct: true, createdAt: '2026-01-02T00:00:00Z' }));
    expect(getConceptWeaknesses(journal, 'spanish')[0].mistakes).toBe(1);
    journal = addLearningAttempt(journal, event({ id: 'later', sessionId: 'session-3', correct: true, createdAt: '2026-01-03T00:00:00Z' }));
    expect(getConceptWeaknesses(journal, 'spanish')).toEqual([]);
  });

  it('caps a concept window at 20 first attempts and excludes self-assessed failures', () => {
    let journal = emptyLearningJournal();
    for (let i = 0; i < 30; i++) journal = addLearningAttempt(journal, event({ id: `a-${i}`, sessionId: `s-${i}`, createdAt: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString() }));
    journal = addLearningAttempt(journal, event({ id: 'self', sessionId: 'self', evidence: 'self-assessed', concept: 'speaking' }));
    expect(getConceptWeaknesses(journal, 'spanish')).toEqual([{ concept: 'polite requests', mistakes: 20, phraseIds: ['coffee'], missionIds: ['spanish-cafe'] }]);
  });

  it('requires success in the same phrase and ability before resolving a mistake', () => {
    let journal = addLearningAttempt(emptyLearningJournal(), event({ ability: 'listening' }));
    journal = addLearningAttempt(journal, event({ id: 'recognize', sessionId: 's2', correct: true, ability: 'recognition', createdAt: '2026-01-02T00:00:00Z' }));
    journal = addLearningAttempt(journal, event({ id: 'another-phrase', sessionId: 's3', correct: true, ability: 'listening', phraseId: 'tea', createdAt: '2026-01-03T00:00:00Z' }));
    expect(getConceptWeaknesses(journal, 'spanish')).toEqual([{ concept: 'polite requests', mistakes: 1, phraseIds: ['coffee'], missionIds: ['spanish-cafe'] }]);
    journal = addLearningAttempt(journal, event({ id: 'resolved', sessionId: 's4', correct: true, ability: 'listening', createdAt: '2026-01-04T00:00:00Z' }));
    expect(getConceptWeaknesses(journal, 'spanish')).toEqual([]);
  });

  it('returns the unresolved listening error after a newer recall error has been corrected', () => {
    let journal = addLearningAttempt(emptyLearningJournal(), event({ ability: 'listening' }));
    journal = addLearningAttempt(journal, event({ id: 'recall-error', sessionId: 's2', ability: 'recall', createdAt: '2026-01-02T00:00:00Z' }));
    journal = addLearningAttempt(journal, event({ id: 'recall-success', sessionId: 's3', correct: true, ability: 'recall', createdAt: '2026-01-03T00:00:00Z' }));
    expect(getUnresolvedLearningMistakes(journal, 'spanish').map((item) => [item.id, item.ability])).toEqual([['event-1', 'listening']]);
  });
});

describe('delayed transfer assessment schedule', () => {
  it('waits seven days from initial practice and early work never postpones the check', () => {
    const initial = emptyLearningJournal();
    expect(getMissionDue(initial, 'spanish-cafe')).toEqual({ due: false, dueAt: null, stage: 'new' });
    let journal = addMissionCompletion(initial, completed());
    journal = addMissionCompletion(journal, completed({ id: 'early', phase: 'transfer', completedAt: '2026-01-03T00:00:00Z' }));
    journal = addMissionCompletion(journal, completed({ id: 'repeat', completedAt: '2026-01-05T00:00:00Z' }));
    expect(getMissionDue(journal, 'spanish-cafe', new Date('2026-01-07'))).toEqual({ due: false, dueAt: '2026-01-08T00:00:00.000Z', stage: 'week' });
    expect(getMissionDue(journal, 'spanish-cafe', new Date('2026-01-08')).due).toBe(true);
  });

  it('schedules monthly checks only after due transfers and handles another mission independently', () => {
    let journal = addMissionCompletion(emptyLearningJournal(), completed());
    journal = addMissionCompletion(journal, completed({ id: 'week', phase: 'transfer', completedAt: '2026-01-08T00:00:00Z' }));
    journal = addMissionCompletion(journal, completed({ id: 'early-month', phase: 'transfer', completedAt: '2026-01-10T00:00:00Z' }));
    expect(getMissionDue(journal, 'spanish-cafe', new Date('2026-02-01'))).toEqual({ due: false, dueAt: '2026-02-07T00:00:00.000Z', stage: 'month' });
    expect(getMissionDue(journal, 'french-cafe').stage).toBe('new');
    journal = addMissionCompletion(journal, completed({ id: 'month', phase: 'transfer', completedAt: '2026-02-08T00:00:00Z' }));
    expect(getMissionDue(journal, 'spanish-cafe', new Date('2026-02-09')).dueAt).toBe('2026-03-10T00:00:00.000Z');
  });
});
