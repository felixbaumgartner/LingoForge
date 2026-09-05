import { describe, expect, it } from "vitest";
import { getMission } from "../../data/missions";
import { emptyLearningJournal } from "../learningJournal";
import { selectRecallPhrases } from "../missionPractice";
import type { LearningAttempt } from "../../types/mission";

const mission = getMission("spanish", "spanish-cafe")!;
function attempt(
  phraseIndex: number,
  correct = true,
  assisted = false,
): LearningAttempt {
  return {
    id: `event-${phraseIndex}`,
    sessionId: "session",
    missionId: mission.id,
    language: mission.language,
    phraseId: `${mission.id}:${mission.phrases[phraseIndex].id}`,
    concept: mission.phrases[phraseIndex].concept,
    ability: "recall",
    evidence: "objective",
    correct,
    assisted,
    phase: "practice",
    createdAt: `2026-08-0${phraseIndex + 1}T10:00:00.000Z`,
  };
}
describe("mission recall selection", () => {
  it("moves on to untested phrases after success instead of repeating the first two forever", () => {
    const journal = emptyLearningJournal();
    for (const index of [0, 1]) {
      const event = attempt(index);
      journal.attempts[event.id] = event;
    }
    expect(
      selectRecallPhrases(mission, journal).map((phrase) => phrase.id),
    ).toEqual(mission.phrases.slice(2).map((phrase) => phrase.id));
  });
  it("returns to a failed or assisted recall before filling with untested phrases", () => {
    for (const assisted of [false, true]) {
      const journal = emptyLearningJournal();
      const event = attempt(3, assisted, assisted);
      journal.attempts[event.id] = event;
      expect(
        selectRecallPhrases(mission, journal).map((phrase) => phrase.id),
      ).toEqual([mission.phrases[3].id, mission.phrases[0].id]);
    }
  });
  it("reviews the oldest successful recall after every phrase has been tested", () => {
    const journal = emptyLearningJournal();
    mission.phrases.forEach((_, index) => {
      const event = attempt(index);
      journal.attempts[event.id] = event;
    });
    expect(
      selectRecallPhrases(mission, journal).map((phrase) => phrase.id),
    ).toEqual(mission.phrases.slice(0, 2).map((phrase) => phrase.id));
  });
});
