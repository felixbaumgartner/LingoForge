import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import app from '../api/index.js';

let server;
let url;
let generated;
const realFetch = globalThis.fetch;
beforeAll(async () => {
  vi.stubGlobal('fetch', (input, init) => String(input).startsWith('https://api.minimax.io/')
    ? Promise.resolve(Response.json({ choices: [{ message: { content: JSON.stringify(generated) } }] }))
    : realFetch(input, init));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.on('listening', resolve));
  url = `http://127.0.0.1:${server.address().port}/api/lessons/generate`;
});
afterAll(async () => { vi.unstubAllGlobals(); await new Promise((resolve) => server.close(resolve)); });
const request = (body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: 'spanish', type: 'writing', level: 1, lesson: 1, ...body }) });

describe('production lesson endpoint', () => {
  it('rejects fractional and string curriculum coordinates', async () => {
    for (const body of [{ level: 1.5 }, { lesson: 2.2 }, { level: '1' }, { lesson: 6 }]) expect((await request(body)).status).toBe(400);
  });
  it('returns canonical metadata and corpus words even if generation supplies conflicting metadata', async () => {
    generated = { title: 'Practice', language: 'french', type: 'speaking', level: 16, wordRange: [1, 800], exercises: [{ type: 'translation', instruction: 'Translate', sentence: 'Hello', answer: 'Hola' }] };
    const response = await request({});
    expect(response.status).toBe(200);
    const lesson = await response.json();
    expect(lesson).toMatchObject({ language: 'spanish', type: 'writing', level: 1, lesson: 1, wordRange: [1, 10] });
    expect(lesson.corpusWords).toHaveLength(10);
    expect(lesson.corpusWords[0]).toMatchObject({ rank: 1 });
  });
  it('refuses an empty generated lesson instead of sending a completable page', async () => {
    generated = { title: 'Empty', exercises: [] };
    expect((await request({})).status).toBe(502);
  });
});
