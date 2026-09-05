import { useEffect, useState } from 'react';
import { fetchWords } from '../api/client';
import type { Language, Word } from '../types/language';

export function useCorpus(language: Language) {
  const [result, setResult] = useState<{ language: Language; words: Word[]; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetchWords(language)
      .then((words) => {
        if (!cancelled) setResult({ language, words, error: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ language, words: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [language, attempt]);
  const current = result?.language === language ? result : null;
  return {
    words: current?.words ?? [],
    loading: !current,
    error: current?.error ?? false,
    retry: () => {
      setResult(null);
      setAttempt((value) => value + 1);
    },
  };
}
