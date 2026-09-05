import type { Language } from '../types/language';
import type { LearningAbility, LearningAttempt, LearningJournal, MissionCompletion } from '../types/mission';

export const JOURNAL_ATTEMPT_LIMIT = 1000;
export const JOURNAL_COMPLETION_LIMIT = 300;
const abilities: LearningAbility[] = ['recognition', 'listening', 'recall', 'use'];
const languages = ['spanish', 'french', 'dutch'];
const phases = ['practice', 'transfer'];
const day = 86400000;
export const emptyLearningJournal = (): LearningJournal => ({ version: 1, attempts: {}, completions: {} });
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_:-]{1,150}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
const timestamp = (value: unknown): value is string => typeof value === 'string' && value.length <= 32 && Number.isFinite(Date.parse(value));
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 100;

function attempt(value: unknown): LearningAttempt | null {
  if (!record(value) || !['id', 'sessionId', 'missionId', 'phraseId'].every((key) => identifier(value[key]))
    || !languages.includes(value.language as string) || !text(value.concept)
    || !abilities.includes(value.ability as LearningAbility) || !['objective', 'self-assessed'].includes(value.evidence as string)
    || typeof value.correct !== 'boolean' || typeof value.assisted !== 'boolean'
    || !phases.includes(value.phase as string) || !timestamp(value.createdAt)) return null;
  // Copy only the schema fields: arbitrary model/browser data never reaches Firestore.
  const result: LearningAttempt = {
    id: value.id as string, sessionId: value.sessionId as string, missionId: value.missionId as string,
    language: value.language as Language, phraseId: value.phraseId as string, concept: value.concept,
    ability: value.ability as LearningAbility, evidence: value.evidence as LearningAttempt['evidence'],
    correct: value.correct, assisted: value.assisted, phase: value.phase as LearningAttempt['phase'], createdAt: new Date(value.createdAt).toISOString(),
  };
  return new TextEncoder().encode(JSON.stringify(result)).length <= 640 ? result : null;
}

function completion(value: unknown): MissionCompletion | null {
  if (!record(value) || !identifier(value.id) || !identifier(value.missionId)
    || !languages.includes(value.language as string) || !phases.includes(value.phase as string)
    || !timestamp(value.completedAt) || typeof value.durationSeconds !== 'number'
    || !Number.isFinite(value.durationSeconds) || value.durationSeconds < 0 || value.durationSeconds > 86400) return null;
  const result: MissionCompletion = {
    id: value.id, missionId: value.missionId, language: value.language as Language,
    phase: value.phase as MissionCompletion['phase'], completedAt: new Date(value.completedAt).toISOString(),
    durationSeconds: Math.round(value.durationSeconds),
  };
  return new TextEncoder().encode(JSON.stringify(result)).length <= 320 ? result : null;
}

function chronological(a: LearningAttempt | MissionCompletion, b: LearningAttempt | MissionCompletion) {
  const aTime = 'createdAt' in a ? a.createdAt : a.completedAt;
  const bTime = 'createdAt' in b ? b.createdAt : b.completedAt;
  return Date.parse(aTime) - Date.parse(bTime) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** Latest 1000 attempts; keep initial practice anchors plus latest completions, at most 300.
 * IDs and strings are bounded so this stays below Firestore's document size limit.
 * Totals intentionally describe retained history rather than unbounded lifetime claims.
 */
export function normalizeLearningJournal(value: unknown): LearningJournal {
  const result = emptyLearningJournal();
  if (!record(value) || value.version !== 1) return result;
  const attempts = record(value.attempts) ? Object.entries(value.attempts).flatMap(([key, raw]) => {
    const valid = attempt(raw);
    return valid && key === valid.id ? [valid] : [];
  }).sort(chronological).slice(-JOURNAL_ATTEMPT_LIMIT) : [];
  const completions = record(value.completions) ? Object.entries(value.completions).flatMap(([key, raw]) => {
    const valid = completion(raw);
    return valid && key === valid.id ? [valid] : [];
  }).sort(chronological) : [];
  const anchors = new Map<string, MissionCompletion>();
  for (const item of completions) {
    if (item.phase === 'practice' && !anchors.has(item.missionId)) anchors.set(item.missionId, item);
  }
  const retained = [...anchors.values()].slice(0, JOURNAL_COMPLETION_LIMIT);
  const retainedIds = new Set(retained.map((item) => item.id));
  const recent = completions.filter((item) => !retainedIds.has(item.id)).slice(-(JOURNAL_COMPLETION_LIMIT - retained.length));
  // slice(-0) would otherwise retain the whole collection.
  if (retained.length < JOURNAL_COMPLETION_LIMIT) retained.push(...recent);
  result.attempts = Object.fromEntries(attempts.map((item) => [item.id, item]));
  result.completions = Object.fromEntries(retained.sort(chronological).map((item) => [item.id, item]));
  return result;
}

/** Events are immutable. A deterministic tie break makes conflicting copies converge. */
export function mergeLearningJournals(a: LearningJournal, b: LearningJournal): LearningJournal {
  const left = normalizeLearningJournal(a);
  const right = normalizeLearningJournal(b);
  function union<T>(first: Record<string, T>, second: Record<string, T>) {
    const result = { ...first };
    for (const [id, event] of Object.entries(second)) {
      if (!Object.hasOwn(result, id) || JSON.stringify(event) < JSON.stringify(result[id])) result[id] = event;
    }
    return result;
  }
  return normalizeLearningJournal({ version: 1, attempts: union(left.attempts, right.attempts), completions: union(left.completions, right.completions) });
}

export function addLearningAttempt(journal: LearningJournal, event: LearningAttempt): LearningJournal {
  if (Object.hasOwn(journal.attempts, event.id)) return journal;
  const valid = attempt(event);
  return valid ? normalizeLearningJournal({ ...journal, attempts: { ...journal.attempts, [valid.id]: valid } }) : journal;
}

export function addMissionCompletion(journal: LearningJournal, event: MissionCompletion): LearningJournal {
  if (Object.hasOwn(journal.completions, event.id)) return journal;
  const valid = completion(event);
  return valid ? normalizeLearningJournal({ ...journal, completions: { ...journal.completions, [valid.id]: valid } }) : journal;
}

const keyFor = (uid: string) => `lingoforge_learning_journal:${encodeURIComponent(uid)}`;
export function loadAccountLearningJournal(uid: string): LearningJournal {
  try { return normalizeLearningJournal(JSON.parse(localStorage.getItem(keyFor(uid)) ?? 'null')); }
  catch { return emptyLearningJournal(); }
}
export function saveAccountLearningJournal(uid: string, journal: LearningJournal): boolean {
  try { localStorage.setItem(keyFor(uid), JSON.stringify(normalizeLearningJournal(journal))); return true; }
  catch { return false; }
}

/** attempts/correct contain only objective, unaided evidence. Other counts are
 * separate and may overlap (a self-assessed attempt can also use assistance). */
export interface AbilityStats { attempts: number; correct: number; assisted: number; selfAssessed: number }
function abilityStats(events: LearningAttempt[]): Record<LearningAbility, AbilityStats> {
  const result = Object.fromEntries(abilities.map((ability) => [ability, { attempts: 0, correct: 0, assisted: 0, selfAssessed: 0 }])) as Record<LearningAbility, AbilityStats>;
  for (const event of events) {
    const stats = result[event.ability];
    if (!event.assisted && event.evidence === 'objective') stats.attempts++;
    if (event.assisted) stats.assisted++;
    if (event.evidence === 'self-assessed') stats.selfAssessed++;
    if (event.correct && !event.assisted && event.evidence === 'objective') stats.correct++;
  }
  return result;
}
export function getAbilityStats(journal: LearningJournal, language: Language) {
  return abilityStats(Object.values(journal.attempts).filter((item) => item.language === language));
}
export function getPhraseAbilityStats(journal: LearningJournal, language: Language, phraseId: string) {
  return abilityStats(Object.values(journal.attempts).filter((item) => item.language === language && item.phraseId === phraseId));
}

/** First practice sets a seven-day check. Only a transfer on/after its due date
 * schedules another check 30 days later; an early practice/test never delays it.
 */
export function getMissionDue(journal: LearningJournal, missionId: string, now: number | Date = Date.now()): { due: boolean; dueAt: string | null; stage: 'new' | 'week' | 'month' } {
  const events = Object.values(journal.completions).filter((item) => item.missionId === missionId).sort(chronological);
  const first = events.find((item) => item.phase === 'practice');
  if (!first) return { due: false, dueAt: null, stage: 'new' };
  let due = Date.parse(first.completedAt) + 7 * day;
  let stage: 'week' | 'month' = 'week';
  for (const item of events) {
    if (item.phase === 'transfer' && Date.parse(item.completedAt) >= due) {
      due = Date.parse(item.completedAt) + 30 * day;
      stage = 'month';
    }
  }
  return { due: Number(now) >= due, dueAt: new Date(due).toISOString(), stage };
}

/** Use the first objective response per session/phrase/ability/phase. For each
 * concept, inspect the latest 20 responses: each unaided error adds one unresolved
 * mistake; a later unaided correct response resolves one for that same phrase and
 * ability (oldest first). Recognizing another phrase cannot erase a listening or
 * recall difficulty. Assisted
 * and self-rated responses neither diagnose nor resolve an objective weakness.
 * Retrying within one session cannot erase the first attempt.
 */
export function getUnresolvedLearningMistakes(journal: LearningJournal, language: Language): LearningAttempt[] {
  const seen = new Set<string>();
  const concepts = new Map<string, LearningAttempt[]>();
  for (const event of Object.values(journal.attempts).filter((item) => item.language === language && item.evidence === 'objective').sort(chronological)) {
    const key = `${event.sessionId}:${event.missionId}:${event.phraseId}:${event.ability}:${event.phase}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (event.assisted) continue;
    concepts.set(event.concept, [...(concepts.get(event.concept) ?? []), event].slice(-20));
  }
  return [...concepts.values()].flatMap((events) => {
    const unresolved: LearningAttempt[] = [];
    for (const event of events) {
      if (!event.correct) unresolved.push(event);
      else {
        const matching = unresolved.findIndex((previous) => previous.phraseId === event.phraseId && previous.ability === event.ability);
        if (matching !== -1) unresolved.splice(matching, 1);
      }
    }
    return unresolved;
  }).sort(chronological);
}

export function getConceptWeaknesses(journal: LearningJournal, language: Language): { concept: string; mistakes: number; phraseIds: string[]; missionIds: string[] }[] {
  const concepts = new Map<string, LearningAttempt[]>();
  for (const event of getUnresolvedLearningMistakes(journal, language)) concepts.set(event.concept, [...(concepts.get(event.concept) ?? []), event]);
  return [...concepts].map(([concept, events]) => ({
    concept, mistakes: events.length, phraseIds: [...new Set(events.map((item) => item.phraseId))], missionIds: [...new Set(events.map((item) => item.missionId))],
  })).sort((a, b) => b.mistakes - a.mistakes || a.concept.localeCompare(b.concept));
}
