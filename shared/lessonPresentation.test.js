import { describe, expect, it } from 'vitest';
import { shuffleLessonChoices } from './lessonPresentation.js';

describe('generated choice presentation', () => {
  it('keeps the answer and feedback correct when model choices change position', () => {
    const question = { question: 'Meaning?', options: ['house', 'water', 'cat', 'dog'], correctIndex: 0, explanation: 'A home.' };
    const original = { questions: [question], exercises: [{ ...question, type: 'multiple-choice' }, { type: 'translation', answer: 'Hola' }] };
    const result = shuffleLessonChoices(original, () => 0);
    for (const item of [result.questions[0], result.exercises[0]]) {
      expect(item.correctIndex).not.toBe(0);
      expect(item.options[item.correctIndex]).toBe('house');
      expect([...item.options].sort()).toEqual([...question.options].sort());
      expect(item.explanation).toBe('A home.');
    }
    expect(original.questions[0].options).toEqual(['house', 'water', 'cat', 'dog']);
    expect(result.exercises[1]).toEqual(original.exercises[1]);
  });
});
