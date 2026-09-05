import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateValidatedLesson, LessonGenerationError, parseLessonResponse } from './lessonGeneration.js';

const lesson = { title: 'Greetings', exercises: [{ type: 'translation', instruction: 'Translate', sentence: 'Hello', answer: 'Hola' }] };
const json = JSON.stringify(lesson);
const prompt = { system: 'Teacher', user: 'Create a lesson' };
afterEach(() => vi.restoreAllMocks());

describe('lesson JSON extraction', () => {
  it('reads plain and fenced JSON despite surrounding prose braces', () => {
    for (const content of [json, `Here {is a lesson}:\n\`\`\`json\n${json}\n\`\`\`\nEnjoy {it}!`, `Introduction {unclosed prose\n${json}\nDone.`]) {
      expect(parseLessonResponse(content, 'writing')).toEqual(lesson);
    }
  });
  it('discards reasoning drafts before selecting the final answer', () => {
    const draft = JSON.stringify({ ...lesson, title: 'Draft' });
    expect(parseLessonResponse(`<think>Draft schema: ${draft}\n{ stray brace</think>\n${json}`, 'writing')).toEqual(lesson);
    expect(() => parseLessonResponse(`<think>${draft}`, 'writing')).toThrow(LessonGenerationError);
  });
  it('handles braces, escaped quotes, and escaped backslashes inside strings', () => {
    const quoted = { ...lesson, title: 'Say "hello" {politely} \\ again' };
    expect(parseLessonResponse(`Here is your lesson:\n${JSON.stringify(quoted)}\n{afterward}`, 'writing')).toEqual(quoted);
  });
  it('rejects partial JSON, invalid content, and executable JavaScript', () => {
    for (const content of [json.slice(0, -5), '{"title":"Empty","exercises":[]}', `({title:'No',exercises:[]})`, undefined]) {
      expect(() => parseLessonResponse(content, 'writing')).toThrow(LessonGenerationError);
    }
  });
});

describe('bounded generation recovery', () => {
  it('returns a valid first response without another call', async () => {
    const complete = vi.fn().mockResolvedValue({ content: json, finishReason: 'stop' });
    expect(await generateValidatedLesson(complete, prompt, 'writing')).toEqual(lesson);
    expect(complete).toHaveBeenCalledOnce();
  });
  it('retries malformed content once with the same deadline and a complete-generation instruction', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const signal = new AbortController().signal;
    const complete = vi.fn().mockResolvedValueOnce({ content: 'bad', finishReason: 'stop' }).mockResolvedValueOnce({ content: json, finishReason: 'stop' });
    expect(await generateValidatedLesson(complete, prompt, 'writing', signal)).toEqual(lesson);
    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[0][1]).toMatchObject({ signal, maxTokens: 8192 });
    expect(complete.mock.calls[1][1]).toMatchObject({ signal, maxTokens: 12288 });
    expect(complete.mock.calls[1][0][1].content).toContain('entire lesson again');
  });
  it('rejects a length-stopped response even when the content looks structurally valid', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const complete = vi.fn().mockResolvedValueOnce({ content: json, finishReason: 'length' }).mockResolvedValueOnce({ content: json, finishReason: 'stop' });
    expect(await generateValidatedLesson(complete, prompt, 'writing')).toEqual(lesson);
    expect(complete).toHaveBeenCalledTimes(2);
  });
  it('never makes a third call after repeated invalid content', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const complete = vi.fn().mockResolvedValue({ content: '{"title":"Empty","exercises":[]}', finishReason: 'stop' });
    await expect(generateValidatedLesson(complete, prompt, 'writing')).rejects.toBeInstanceOf(LessonGenerationError);
    expect(complete).toHaveBeenCalledTimes(2);
  });
  it('does not retry transport/auth errors or provider filters', async () => {
    for (const complete of [vi.fn().mockRejectedValue(new Error('401')), vi.fn().mockResolvedValue({ content: '', finishReason: 'content_filter' })]) {
      await expect(generateValidatedLesson(complete, prompt, 'writing')).rejects.toThrow();
      expect(complete).toHaveBeenCalledOnce();
    }
  });
  it('does not retry when the shared deadline expires during the first response', async () => {
    const controller = new AbortController();
    const complete = vi.fn().mockImplementation(async () => { controller.abort(); return { content: 'bad', finishReason: 'stop' }; });
    await expect(generateValidatedLesson(complete, prompt, 'writing', controller.signal)).rejects.toThrow();
    expect(complete).toHaveBeenCalledOnce();
  });
});
