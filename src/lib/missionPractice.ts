import type { LearningJournal, Mission } from "../types/mission";

/** First cover unsupported recall, then unseen chunks, then the oldest success. */
export function selectRecallPhrases(
  mission: Mission,
  journal: LearningJournal,
  count = 2,
) {
  const ranked = mission.phrases.map((phrase, index) => {
    const latest = Object.values(journal.attempts)
      .filter(
        (attempt) =>
          attempt.missionId === mission.id &&
          attempt.phraseId === `${mission.id}:${phrase.id}` &&
          attempt.ability === "recall" &&
          attempt.evidence === "objective",
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
    return {
      phrase,
      index,
      priority: !latest ? 1 : latest.correct && !latest.assisted ? 2 : 0,
      seen: latest ? Date.parse(latest.createdAt) : 0,
    };
  });
  return ranked
    .sort(
      (a, b) => a.priority - b.priority || a.seen - b.seen || a.index - b.index,
    )
    .slice(0, count)
    .map((item) => item.phrase);
}
