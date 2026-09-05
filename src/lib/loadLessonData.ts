import { generateLesson } from '../api/client';
import { getCachedLesson, setCachedLesson } from './persistence';
import { isLessonContent } from '../../shared/lessonContract.js';
import type { Language } from '../types/language';
import type { Lesson, LessonType } from '../types/lesson';

/** Browser caching is optional: blocked or full storage must not block learning. */
export async function loadLessonData(language: Language, type: LessonType, level: number, lessonNum: number, signal: AbortSignal): Promise<Lesson> {
  let cached: unknown = null;
  try { cached = getCachedLesson(language, type, level, lessonNum); } catch { /* Fetch below. */ }
  if (cached && (cached as Lesson).type === type && (cached as Lesson).language === language && isLessonContent(cached, type)) return cached as Lesson;
  const result = await generateLesson(language, type, level, lessonNum, signal);
  signal.throwIfAborted();
  try { setCachedLesson(language, type, level, lessonNum, result); } catch { /* Session remains usable. */ }
  return result;
}
