import { describe, expect, it } from 'vitest';
import { gradeWritingAnswer, getExerciseWord } from '../answerGrading';
import { isLessonContent, buildLessonPrompt, describeLessonIssues } from '../../../shared/lessonContract.js';
import type { WritingExercise } from '../../types/lesson';

const exercise: WritingExercise = { type: 'translation', instruction: 'Translate', sentence: 'I am here.', answer: 'Estoy aquí.', acceptedAnswers: ['Yo estoy aquí.'], corpusRank: 3 };

describe('writing feedback', () => {
  it('accepts explicit alternatives and presentation differences', () => {
    expect(gradeWritingAnswer(exercise, '  YO  estoy aquí! ').correct).toBe(true);
    expect(gradeWritingAnswer(exercise, 'Estoy aqui\u0301').correct).toBe(true);
  });
  it('explains accents without accepting a different written word', () => {
    expect(gradeWritingAnswer(exercise, 'Estoy aqui')).toEqual({ correct: false, feedback: 'Almost — check the accents or letters: Estoy aquí.' });
    expect(gradeWritingAnswer({ ...exercise, answer: 'año', acceptedAnswers: [] }, 'ano').correct).toBe(false);
  });
  it('rejects unanswered, different meanings, and partial answers', () => {
    for (const answer of ['', '  ', 'Estoy allí', 'aquí']) expect(gradeWritingAnswer(exercise, answer).correct).toBe(false);
  });
  it('handles multiple choice without a textual answer', () => {
    const choice = { type: 'multiple-choice', instruction: 'Choose', word: 'aquí', options: ['here', 'there'], correctIndex: 0 } as WritingExercise;
    expect(gradeWritingAnswer(choice, '0').correct).toBe(true);
    expect(gradeWritingAnswer(choice, '1').correct).toBe(false);
    expect(gradeWritingAnswer(choice, '').correct).toBe(false);
  });
  it('tracks sentence exercises by canonical rank and supports old word exercises', () => {
    const words = [{ rank: 3, word: 'estar', translation: 'to be' }];
    expect(getExerciseWord(exercise, words)?.rank).toBe(3);
    expect(getExerciseWord({ ...exercise, corpusRank: undefined, answer: 'estar' }, words)?.rank).toBe(3);
    expect(getExerciseWord({ ...exercise, corpusRank: 999 }, words)).toBeUndefined();
  });
});

describe('shared lesson contract', () => {
  it('accepts legacy content without new optional fields', () => {
    expect(isLessonContent({ title: 'Practice', exercises: [exercise] }, 'writing')).toBe(true);
    expect(isLessonContent({ title: 'Practice', exercises: [{ type: 'multiple-choice', instruction: 'Choose', word: 'aquí', options: ['here', 'there'], correctIndex: 0 }] }, 'writing')).toBe(true);
  });
  it('rejects empty lessons, malformed exercises, and out-of-range answer indexes', () => {
    for (const value of [null, [], {title:'Empty',exercises:[]}, {title:'Bad',exercises:[{...exercise,answer:''}]}, {title:'Bad',exercises:[{type:'multiple-choice',instruction:'Choose',word:'aquí',options:['here','there'],correctIndex:4}]}]) expect(isLessonContent(value, 'writing')).toBe(false);
  });
  it('requires usable reading and speaking material', () => {
    expect(isLessonContent({ title: 'Reading', passage: 'Hola', passageTranslation: 'Hello', vocabulary: [], questions: [] }, 'reading')).toBe(false);
    expect(isLessonContent({ title: 'Speaking', pronunciationCards: [] }, 'speaking')).toBe(false);
  });
  it('rejects malformed optional fields that the lesson interface renders', () => {
    const choice = { type: 'multiple-choice', instruction: 'Choose', word: 'el', options: ['the', 'and'], correctIndex: 0 };
    for (const extra of [{ words: 'bad' }, { sentence: {} }, { word: [] }, { explanation: {} }]) {
      expect(isLessonContent({ title: 'Practice', exercises: [{ ...choice, ...extra }] }, 'writing')).toBe(false);
    }
  });
  it('accepts harmless empty optional fields from otherwise valid generation', () => {
    expect(isLessonContent({ title: 'Practice', objective: null, exercises: [{ ...exercise, hint: '', explanation: null, word: null, words: [], acceptedAnswers: null }] }, 'writing')).toBe(true);
  });
  it('rejects the live Spanish word-order mismatch and identifies the answer paths', () => {
    const invalid = { title: 'Practice', exercises: [{ type: 'word-order', instruction: 'Put in order', words: ['casa', 'y', 'el', 'perro', 'en', 'está'], answer: 'El perro y el perro está en la casa', acceptedAnswers: ['El perro y el gato están en la casa'] }] };
    expect(isLessonContent(invalid, 'writing')).toBe(false);
    expect(describeLessonIssues(invalid, 'writing').map((issue) => issue.path)).toEqual(['$.exercises[0].answer', '$.exercises[0].acceptedAnswers[0]']);
  });
  it('compares word-order counts while ignoring case/punctuation but preserving accents', () => {
    const order = { type: 'word-order', instruction: 'Put in order', words: ['café', 'el', 'en', 'el', 'está'], answer: 'El café está en el.', acceptedAnswers: [] };
    const valid = (overrides: object) => isLessonContent({ title: 'Practice', exercises: [{ ...order, ...overrides }] }, 'writing');
    expect(valid({})).toBe(true);
    expect(valid({ answer: 'El café está en.' })).toBe(false);
    expect(valid({ answer: 'El cafe está en el.' })).toBe(false);
    expect(valid({ acceptedAnswers: ['El café está en.'] })).toBe(false);
    expect(valid({ words: ['collègue', 'son', 'avec', 'Il', 'travaille'], answer: 'Il travaille avec son collègue.' })).toBe(true);
  });
  it('rejects equivalent multiple-choice options after formatting normalization', () => {
    const choice = { type: 'multiple-choice', instruction: 'Choose', word: 'el', options: ['A) The', 'B) the.'], correctIndex: 0 };
    expect(isLessonContent({ title: 'Practice', exercises: [choice] }, 'writing')).toBe(false);
    expect(describeLessonIssues({ title: 'Practice', exercises: [choice] }, 'writing')[0].path).toBe('$.exercises[0].options');
  });
  it('prompts for natural supporting words, explanations, and stable corpus ranks', () => {
    const prompt = buildLessonPrompt([{ rank: 3, word: 'estar', translation: 'to be' }], 'writing', 'spanish', 1);
    expect(prompt.system).toContain('common function words');
    expect(prompt.user).toContain('"corpusRank":3');
    expect(prompt.user).toContain('acceptedAnswers');
    expect(prompt.system).not.toContain('Use ONLY');
    expect(prompt.system).not.toContain('How to Learn a Language in 5 Days');
  });
});
