import { useState } from 'react';
import { useAppStore } from '../store/appStore';

export function useStudyGoal() {
  const uid = useAppStore((s) => s.uid);
  const key = `lingoforge_study_goal:${uid ?? 'guest'}`;
  const [preferences, setPreferences] = useState<Record<string, number>>({});
  let saved = 10;
  try {
    const value = Number(localStorage.getItem(key));
    if ([5, 10, 20].includes(value)) saved = value;
  } catch {
    /* Use the default if browser storage is unavailable. */
  }
  const goal = preferences[key] ?? saved;
  function setGoal(value: number) {
    if (![5, 10, 20].includes(value)) return;
    setPreferences((current) => ({ ...current, [key]: value }));
    try {
      localStorage.setItem(key, String(value));
    } catch {
      /* In-memory preference remains usable. */
    }
  }
  return { goal, setGoal };
}
