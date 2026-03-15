import { useState, useCallback } from 'react';
import { generateLesson } from '../api/client';
import { getCachedLesson, setCachedLesson } from '../lib/persistence';
import type { Language } from '../types/language';
import type { Lesson, LessonType } from '../types/lesson';

export function useLesson() {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLesson = useCallback(async (language: Language, type: LessonType, level: number, lessonNum: number) => {
    setIsLoading(true);
    setError(null);

    const cached = getCachedLesson(language, type, level, lessonNum);
    if (cached) {
      setLesson(cached as Lesson);
      setIsLoading(false);
      return;
    }

    try {
      const result = await generateLesson(language, type, level, lessonNum);
      setCachedLesson(language, type, level, lessonNum, result);
      setLesson(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lesson');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { lesson, isLoading, error, loadLesson };
}
