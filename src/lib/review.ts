import type { Language, Word } from '../types/language';
import type { ProgressMap, WordPerformanceMap } from '../types/progress';
import {
  getWeakWords,
  getWordsDueForReview,
  LESSONS_PER_LEVEL,
  TOTAL_LEVELS,
  wordPerfKey,
} from './persistence';

export type ReviewFocus = 'all' | 'weak' | 'due';
export const CARDS_PER_SESSION = 30;

/** Include only words actually encountered, including progress saved before word tracking. */
export function getReviewableRanks(
  progress: ProgressMap,
  map: WordPerformanceMap,
  language: Language,
): Set<number> {
  const ranks = new Set<number>();
  for (const wp of Object.values(map)) {
    if (wp.language === language && Number.isInteger(wp.rank) && wp.rank >= 1 && wp.rank <= 800)
      ranks.add(wp.rank);
  }
  for (const type of ['reading', 'writing', 'speaking'] as const) {
    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      for (let lesson = 1; lesson <= LESSONS_PER_LEVEL; lesson++) {
        if (!progress[language]?.[type]?.[`${level}-${lesson}`]?.completed) continue;
        const start = (level - 1) * 50 + (lesson - 1) * 10 + 1;
        for (let rank = start; rank < start + 10; rank++) ranks.add(rank);
      }
    }
  }
  return ranks;
}

/** Build a session once; subsequent ratings must never remove or reorder its cards. */
export function selectReviewWords(
  corpus: Word[],
  progress: ProgressMap,
  map: WordPerformanceMap,
  language: Language,
  focus: ReviewFocus = 'all',
): Word[] {
  const eligible = getReviewableRanks(progress, map, language);
  const weak = new Set(getWeakWords(map, language, 800).map((wp) => wp.rank));
  const due = new Map(getWordsDueForReview(map, language).map((wp) => [wp.rank, wp.nextReview]));
  return corpus
    .filter(
      (word) =>
        eligible.has(word.rank) &&
        (focus !== 'weak' || weak.has(word.rank)) &&
        (focus !== 'due' || due.has(word.rank)),
    )
    .sort((a, b) => {
      const aDue = due.get(a.rank);
      const bDue = due.get(b.rank);
      if (aDue && bDue) return aDue.localeCompare(bDue) || a.rank - b.rank;
      if (aDue || bDue) return aDue ? -1 : 1;
      const weakPriority = Number(weak.has(b.rank)) - Number(weak.has(a.rank));
      if (weakPriority) return weakPriority;
      // Reach unseen and least-recently-practiced words before repeating a recent batch.
      const aSeen = map[wordPerfKey(language, a.rank)]?.lastSeen ?? '';
      const bSeen = map[wordPerfKey(language, b.rank)]?.lastSeen ?? '';
      return aSeen.localeCompare(bSeen) || a.rank - b.rank;
    })
    .slice(0, CARDS_PER_SESSION);
}
