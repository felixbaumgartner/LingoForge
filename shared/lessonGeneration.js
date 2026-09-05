import { isLessonContent } from './lessonContract.js';

export class LessonGenerationError extends Error {
  constructor(reason) {
    super('The lesson was incomplete. Please try again.');
    this.name = 'LessonGenerationError';
    this.reason = reason;
  }
}

/** Extract JSON without evaluating code or confusing prose/reasoning braces with JSON. */
export function parseLessonResponse(content, type) {
  if (typeof content !== 'string' || content.length > 200000) throw new LessonGenerationError('malformed');
  // MiniMax M2.x can include native reasoning tags even when asked for JSON.
  // Never interpret a draft object inside the reasoning as the finished lesson.
  const answer = content.replace(/<think\b[^>]*>[\s\S]*?<\/think\s*>/gi, '')
    .replace(/<think\b[^>]*>[\s\S]*$/gi, '').trim();
  const candidates = [...answer.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((match) => match[1]);
  candidates.push(answer);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (isLessonContent(parsed, type)) return parsed;
    } catch { /* Look for a balanced JSON object inside surrounding prose. */ }
    let inspected = 0;
    for (let start = candidate.indexOf('{'); start !== -1 && inspected < 100; start = candidate.indexOf('{', start + 1)) {
      inspected++;
      let depth = 0, quoted = false, escaped = false;
      for (let end = start; end < candidate.length; end++) {
        const character = candidate[end];
        if (quoted) {
          if (escaped) escaped = false;
          else if (character === '\\') escaped = true;
          else if (character === '"') quoted = false;
        } else if (character === '"') quoted = true;
        else if (character === '{') depth++;
        else if (character === '}') {
          depth--;
          if (depth === 0) {
            try {
              const parsed = JSON.parse(candidate.slice(start, end + 1));
              if (isLessonContent(parsed, type)) return parsed;
            } catch { /* This was a prose brace or malformed object. */ }
            break;
          }
        }
      }
    }
  }
  throw new LessonGenerationError('malformed');
}

/** At most one retry for malformed/truncated content, sharing one request deadline. */
export async function generateValidatedLesson(complete, prompt, type, signal = AbortSignal.timeout(55000)) {
  let failure = new LessonGenerationError('malformed');
  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted();
    const retryInstruction = attempt === 0 ? '' : '\nThe previous generation was incomplete or invalid JSON. Generate the entire lesson again as one complete JSON object. Keep examples and explanations concise. Do not include prose, code fences, or a partial continuation.';
    // Network/auth/rate-limit errors intentionally propagate without another paid call.
    const response = await complete([
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user + retryInstruction },
    ], { temperature: attempt === 0 ? 0.7 : 0.4, maxTokens: attempt === 0 ? 8192 : 12288, signal });
    signal.throwIfAborted();
    if (response.finishReason === 'length' || response.finishReason === 'max_tokens') {
      failure = new LessonGenerationError('truncated');
      console.warn('Lesson generation incomplete', { attempt: attempt + 1, reason: failure.reason, finishReason: response.finishReason });
      continue;
    }
    if (response.finishReason && response.finishReason !== 'stop') throw new Error(`Lesson provider stopped: ${response.finishReason}`);
    try { return parseLessonResponse(response.content, type); }
    catch (error) {
      if (!(error instanceof LessonGenerationError)) throw error;
      failure = error;
      console.warn('Lesson generation incomplete', { attempt: attempt + 1, reason: failure.reason, finishReason: response.finishReason ?? 'unknown' });
    }
  }
  throw failure;
}
