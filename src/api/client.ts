import type { Word, Language } from '../types/language';
import type { Lesson, LessonType } from '../types/lesson';
import { isLessonContent } from '../../shared/lessonContract.js';

export async function fetchWords(language: Language, signal?: AbortSignal): Promise<Word[]> {
  const res = await fetch(`/api/words/${language}`, { signal });
  if (!res.ok) throw new Error(`Failed to fetch words: ${res.statusText}`);
  const result: unknown = await res.json();
  const ranks = new Set<number>();
  if (!Array.isArray(result) || !result.every((word) => {
    if (!word || typeof word !== 'object' || !Number.isInteger(word.rank) || word.rank < 1 || word.rank > 800
      || ranks.has(word.rank) || typeof word.word !== 'string' || !word.word.trim()
      || typeof word.translation !== 'string' || !word.translation.trim()
      || (word.notes !== undefined && typeof word.notes !== 'string')) return false;
    ranks.add(word.rank);
    return true;
  })) throw new Error('The word list was incomplete. Please try again.');
  return result;
}

export async function generateLesson(
  language: Language,
  type: LessonType,
  level: number,
  lesson: number,
  signal?: AbortSignal,
): Promise<Lesson> {
  const res = await fetch('/api/lessons/generate', {
    method: 'POST',
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(65000)]) : AbortSignal.timeout(65000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, type, level, lesson }),
  });
  if (!res.ok) throw new Error('Your lesson could not be generated. Please try again.');
  const result = await res.json();
  if (!isLessonContent(result, type)) throw new Error('The lesson was incomplete. Please try again.');
  return result;
}

export async function synthesizeSpeech(
  text: string,
  language: Language,
  speed: number = 1.0
): Promise<Blob> {
  const res = await fetch('/api/tts/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language, speed }),
  });
  if (!res.ok) throw new Error(`Failed to synthesize speech: ${res.statusText}`);
  return res.blob();
}
