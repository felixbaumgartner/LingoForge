import { describe, expect, it } from 'vitest';
import { getMission, getMissions, MISSIONS } from '../missions';
import { LANGUAGES } from '../../types/language';

describe('authored mission curriculum', () => {
  it('offers all three practical goals independently in every language', () => {
    expect(MISSIONS).toHaveLength(9);
    expect(new Set(MISSIONS.map((mission) => mission.id)).size).toBe(MISSIONS.length);
    for (const language of LANGUAGES) {
      const missions = getMissions(language.id);
      expect(missions).toHaveLength(3);
      expect(new Set(missions.map((mission) => mission.goal))).toEqual(new Set(['everyday', 'social', 'appointments']));
      for (const mission of missions) {
        expect(mission.id.startsWith(`${language.id}-`)).toBe(true);
        expect(getMission(language.id, mission.id)).toBe(mission);
      }
    }
    expect(getMission('french', 'spanish-cafe')).toBeUndefined();
    expect(getMission('spanish', 'missing')).toBeUndefined();
  });

  it.each(MISSIONS)('$id has teachable chunks and answerable questions', (mission) => {
    expect(mission.phrases).toHaveLength(4);
    const phraseIds = new Set(mission.phrases.map((phrase) => phrase.id));
    expect(phraseIds.size).toBe(4);
    expect(new Set(mission.phrases.map((phrase) => phrase.translation)).size).toBe(4);
    for (const phrase of mission.phrases) {
      for (const field of [phrase.text, phrase.translation, phrase.concept, phrase.explanation]) {
        expect(field.trim().length).toBeGreaterThan(0);
      }
      expect(new Set([phrase.text, ...(phrase.alternatives ?? [])]).size).toBe(1 + (phrase.alternatives?.length ?? 0));
    }
    expect(mission.questions).toHaveLength(2);
    expect(mission.transfer.questions).toHaveLength(2);
    const questions = [...mission.questions, ...mission.transfer.questions];
    expect(new Set(questions.map((question) => question.id)).size).toBe(4);
    for (const question of questions) {
      expect(phraseIds.has(question.phraseId)).toBe(true);
      expect(question.options).toHaveLength(3);
      expect(new Set(question.options.map((option) => option.toLocaleLowerCase().trim())).size).toBe(3);
      expect(Number.isInteger(question.correctIndex)).toBe(true);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(question.options.length);
      expect(question.explanation.length).toBeGreaterThan(20);
    }
    for (const challenge of [mission.challenge, mission.transfer.challenge]) {
      expect(challenge.checklist).toHaveLength(3);
      expect(challenge.modelAnswer.length).toBeGreaterThan(20);
      expect(challenge.translation.length).toBeGreaterThan(20);
      expect(challenge.prompt.length).toBeGreaterThan(20);
    }
    expect(mission.transfer.story.text).not.toBe(mission.story.text);
    expect(mission.transfer.challenge.modelAnswer).not.toBe(mission.challenge.modelAnswer);
    expect(mission.transfer.challenge.prompt).not.toMatch(/[()]/);
    expect(mission.story.text.split('\n').length).toBe(mission.story.translation.split('\n').length);
    expect(mission.transfer.story.text.split('\n').length).toBe(mission.transfer.story.translation.split('\n').length);
  });

  // These assertions preserve reviewed meaning contrasts, not just valid indices.
  // Changing a story requires revisiting both its supporting line and its answer.
  it.each([
    ['spanish-cafe', 'No, sin leche.', 'Without milk', 'A tea to drink here'],
    ['french-cafe', 'Noah : Avec du sucre', 'With sugar', 'A tea to have here'],
    ['dutch-cafe', 'Daan: Met suiker', 'With sugar', 'A tea for here'],
    ['spanish-introductions', 'Soy de Perú, pero vivo en Barcelona.', 'Peru', 'Pablo'],
    ['french-introductions', 'Je viens de Suisse, mais j’habite à Paris.', 'Switzerland', 'Amine'],
    ['dutch-introductions', 'Ik kom uit Spanje, maar ik woon in Rotterdam.', 'Spain', 'Adam'],
    ['spanish-appointment', 'Sí, el viernes a las dos.', 'Thursday', 'Friday at two'],
    ['french-appointment', 'Oui, vendredi à quatorze heures.', 'Thursday', 'Friday at two in the afternoon'],
    ['dutch-appointment', 'Ja, vrijdag om twee uur.', 'Thursday', 'Friday at two'],
  ])('%s transfer questions preserve the changed facts', (id, supportingText, firstAnswer, secondAnswer) => {
    const mission = MISSIONS.find((mission) => mission.id === id)!;
    expect(mission.transfer.story.text).toContain(supportingText);
    expect(mission.story.text).not.toContain(supportingText);
    expect(mission.transfer.questions.map((question) => question.options[question.correctIndex])).toEqual([firstAnswer, secondAnswer]);
  });

  it('retains meaningful accents and distinct request registers', () => {
    expect(getMission('spanish', 'spanish-introductions')!.phrases[2].text).toContain('México');
    expect(getMission('french', 'french-cafe')!.phrases[0].text).toContain('s’il vous plaît');
    expect(getMission('dutch', 'dutch-introductions')!.story.text).toContain('België');
    expect(getMission('dutch', 'dutch-appointment')!.phrases[3].alternatives).toContain('Dus dinsdag om tien uur. Dankuwel.');
  });
});
