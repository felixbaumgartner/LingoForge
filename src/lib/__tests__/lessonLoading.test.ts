import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWords } from '../../api/client';
import { loadLessonData } from '../loadLessonData';

afterEach(() => vi.unstubAllGlobals());
const word = { rank: 1, word: 'hola', translation: 'hello' };
const lesson = { language: 'spanish', type: 'writing', level: 1, title: 'Greetings', exercises: [{ type: 'translation', instruction: 'Translate', sentence: 'Hello', answer: 'Hola' }] };

describe('corpus responses', () => {
  it('accepts valid words and preserves cancellation', async () => {
    const request = vi.fn().mockResolvedValue(Response.json([word]));
    vi.stubGlobal('fetch', request);
    const signal = new AbortController().signal;
    expect(await fetchWords('spanish', signal)).toEqual([word]);
    expect(request).toHaveBeenCalledWith('/api/words/spanish', { signal });
  });
  it('rejects malformed arrays, duplicate ranks, and unsafe optional display fields', async () => {
    for (const value of [{ words: [] }, [null], [{ ...word, rank: 801 }], [{ ...word, rank: 1.1 }], [word, word], [{ ...word, word: '' }], [{ ...word, translation: [] }], [{ ...word, notes: {} }]]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(value)));
      await expect(fetchWords('spanish')).rejects.toThrow('word list');
    }
  });
});

describe('optional lesson caching', () => {
  it('loads a usable lesson when browser storage reads and writes are blocked', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('SecurityError'); } });
    const request = vi.fn().mockResolvedValue(Response.json(lesson));
    vi.stubGlobal('fetch', request);
    expect(await loadLessonData('spanish', 'writing', 1, 1, new AbortController().signal)).toEqual(lesson);
    expect(request).toHaveBeenCalledOnce();
  });
  it('replaces malformed cached content with a freshly validated lesson', async () => {
    const write = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ 'spanish-writing-1-1': { ...lesson, exercises: [] } }), setItem: write });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(lesson)));
    expect(await loadLessonData('spanish', 'writing', 1, 1, new AbortController().signal)).toEqual(lesson);
    expect(write).toHaveBeenCalledOnce();
  });
});
