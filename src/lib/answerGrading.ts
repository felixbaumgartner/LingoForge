import type { CorpusWord, WritingExercise } from '../types/lesson';

/** Ignore presentation differences but preserve meaningful letters and accents. */
export function normalizeWritingAnswer(answer: string): string {
  return answer.normalize('NFC').toLocaleLowerCase().trim()
    .replace(/[’‘]/g, "'").replace(/[.!?,;:"“”¿¡]/g, '').replace(/\s+/g, ' ');
}

export function gradeWritingAnswer(exercise: WritingExercise, answer: string): { correct: boolean; feedback: string } {
  if (!answer.trim()) return { correct: false, feedback: 'Try an answer before checking.' };
  if (exercise.type === 'multiple-choice') return {
    correct: answer === String(exercise.correctIndex),
    feedback: `Answer: ${exercise.options?.[exercise.correctIndex ?? -1] ?? ''}`,
  };
  const candidates = [exercise.answer, ...(exercise.acceptedAnswers ?? [])].filter(Boolean);
  const normalized = normalizeWritingAnswer(answer);
  if (candidates.some((value) => normalizeWritingAnswer(value) === normalized)) return { correct: true, feedback: 'Correct!' };
  const unaccented = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (candidates.some((value) => unaccented(normalizeWritingAnswer(value)) === unaccented(normalized))) {
    return { correct: false, feedback: `Almost — check the accents or letters: ${exercise.answer}` };
  }
  return { correct: false, feedback: `Model answer: ${exercise.answer}` };
}

export function getExerciseWord(exercise: WritingExercise, words: CorpusWord[]): CorpusWord | undefined {
  if (exercise.corpusRank !== undefined) return words.find((word) => word.rank === exercise.corpusRank);
  // Old cached lessons have no rank. Track only unambiguous whole-word matches.
  return words.find((word) => normalizeWritingAnswer(word.word) === normalizeWritingAnswer(exercise.word || exercise.answer || ''));
}
