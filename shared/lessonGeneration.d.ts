export class LessonGenerationError extends Error { reason: string; constructor(reason: string); }
export function parseLessonResponse(content: unknown, type: string): Record<string, unknown>;
export function generateValidatedLesson(
  complete: (messages: { role: 'system' | 'user'; content: string }[], options: { temperature: number; maxTokens: number; signal: AbortSignal }) => Promise<{ content: unknown; finishReason?: string }>,
  prompt: { system: string; user: string }, type: string, signal?: AbortSignal,
): Promise<Record<string, unknown>>;
