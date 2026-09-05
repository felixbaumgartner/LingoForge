export function isLessonContent(value: unknown, type: string): boolean;
export function describeLessonIssues(value: unknown, type: string): { path: string; expected: string; received: string }[];
export function buildLessonPrompt(words: { rank: number; word: string; translation: string }[], type: 'reading' | 'writing' | 'speaking', language: string, level: number): { system: string; user: string };
