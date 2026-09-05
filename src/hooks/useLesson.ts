import { useState, useCallback, useEffect, useRef } from 'react';
import { loadLessonData } from '../lib/loadLessonData';
import type { Language } from '../types/language';
import type { Lesson, LessonType } from '../types/lesson';

export function useLesson() {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);

  const loadLesson = useCallback(async (language: Language, type: LessonType, level: number, lessonNum: number) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setIsLoading(true);
    setLesson(null);
    setError(null);
    try {
      const result = await loadLessonData(language, type, level, lessonNum, controller.signal);
      if (controller.signal.aborted) return;
      setLesson(result);
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error && err.name === 'TimeoutError'
        ? 'This lesson took too long. Please try again.'
        : err instanceof Error ? err.message : 'Failed to load lesson');
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  return { lesson, isLoading, error, loadLesson };
}
