import type { ProgressMap, WordPerformanceMap } from '../types/progress';

const LEGACY_OWNER = 'lingoforge_legacy_owner';
const languages = ['spanish', 'french', 'dutch'] as const;
const lessonTypes = ['reading', 'writing', 'speaking'] as const;

export function emptyProgress(): ProgressMap {
  return {
    spanish: { reading: {}, writing: {}, speaking: {} },
    french: { reading: {}, writing: {}, speaking: {} },
    dutch: { reading: {}, writing: {}, speaking: {} },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeProgress(value: unknown): ProgressMap {
  const result = emptyProgress();
  if (!isRecord(value)) return result;
  for (const language of languages) {
    const languageData = value[language];
    if (!isRecord(languageData)) continue;
    for (const type of lessonTypes) {
      const lessons = languageData[type];
      if (!isRecord(lessons)) continue;
      for (const [key, entry] of Object.entries(lessons)) {
        if (!/^(?:[1-9]|1[0-6])-[1-5]$/.test(key) || !isRecord(entry) || entry.completed !== true) continue;
        result[language][type][key] = {
          completed: true,
          ...(typeof entry.score === 'number' && Number.isFinite(entry.score) ? { score: entry.score } : {}),
          ...(typeof entry.completedAt === 'string' && Number.isFinite(Date.parse(entry.completedAt)) ? { completedAt: entry.completedAt } : {}),
        };
      }
    }
  }
  return result;
}

export function normalizeWordPerformance(value: unknown): WordPerformanceMap {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, entry]) => {
    if (!isRecord(entry) || !languages.includes(entry.language as typeof languages[number])) return false;
    return typeof entry.rank === 'number' && Number.isInteger(entry.rank) && entry.rank > 0 && entry.rank <= 800
      && key === `${entry.language}-${entry.rank}`
      && typeof entry.word === 'string' && typeof entry.translation === 'string'
      && ['lastSeen', 'nextReview'].every((field) => typeof entry[field] === 'string' && Number.isFinite(Date.parse(entry[field] as string)))
      && ['timesCorrect', 'timesIncorrect', 'streak', 'reviewCount', 'easeFactor', 'interval'].every((field) => typeof entry[field] === 'number' && Number.isFinite(entry[field]) && (entry[field] as number) >= 0)
      && (entry.lastCorrect === null || (typeof entry.lastCorrect === 'string' && Number.isFinite(Date.parse(entry.lastCorrect))))
      && [null, 'hard', 'moderate', 'easy'].includes(entry.rating as string | null);
  })) as WordPerformanceMap;
}

function keyFor(uid: string, kind: 'progress' | 'word_performance') {
  return `lingoforge_${kind}:${encodeURIComponent(uid)}`;
}

function read(key: string): unknown {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function saveAccountProgress(uid: string, progress: ProgressMap): boolean {
  try {
    localStorage.setItem(keyFor(uid, 'progress'), JSON.stringify(progress));
    return true;
  } catch { return false; }
}

export function saveAccountWords(uid: string, words: WordPerformanceMap): boolean {
  try {
    localStorage.setItem(keyFor(uid, 'word_performance'), JSON.stringify(words));
    return true;
  } catch { return false; }
}

export function loadAccount(uid: string): { progress: ProgressMap; wordPerformance: WordPerformanceMap } {
  // The previous app had no owner attached to its cache. Assign that legacy
  // cache once, retain it for recovery, and never import it into a second user.
  let ownsLegacy = false;
  try {
    const owner = localStorage.getItem(LEGACY_OWNER);
    if (owner === null) localStorage.setItem(LEGACY_OWNER, uid);
    ownsLegacy = localStorage.getItem(LEGACY_OWNER) === uid;
  } catch { /* Storage can be unavailable; cloud progress still works. */ }
  const progress = normalizeProgress(read(keyFor(uid, 'progress')) ?? (ownsLegacy ? read('lingoforge_progress') : null));
  const wordPerformance = normalizeWordPerformance(read(keyFor(uid, 'word_performance')) ?? (ownsLegacy ? read('lingoforge_word_performance') : null));
  saveAccountProgress(uid, progress);
  saveAccountWords(uid, wordPerformance);
  return { progress, wordPerformance };
}
