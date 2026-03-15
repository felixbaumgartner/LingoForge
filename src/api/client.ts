import type { Word, Language } from '../types/language';
import type { Lesson, LessonType } from '../types/lesson';

export async function fetchWords(language: Language): Promise<Word[]> {
  const res = await fetch(`/api/words/${language}`);
  if (!res.ok) throw new Error(`Failed to fetch words: ${res.statusText}`);
  return res.json();
}

export async function generateLesson(
  language: Language,
  type: LessonType,
  level: number,
  lesson: number
): Promise<Lesson> {
  const res = await fetch('/api/lessons/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, type, level, lesson }),
  });
  if (!res.ok) throw new Error(`Failed to generate lesson: ${res.statusText}`);
  return res.json();
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
