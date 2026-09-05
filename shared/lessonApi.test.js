import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../api/index.js';

let server;
let url;
let generated;
let responses;
let providerRequests;
const realFetch = globalThis.fetch;
beforeAll(async () => {
  vi.stubGlobal('fetch', (input, init) => {
    if (!String(input).startsWith('https://api.minimax.io/')) return realFetch(input, init);
    providerRequests.push(JSON.parse(init.body));
    const response = responses.shift();
    if (response?.status) return Promise.resolve(new Response('Provider unavailable', { status: response.status }));
    return Promise.resolve(Response.json({ choices: [{ finish_reason: response?.finishReason ?? 'stop', message: { content: response?.content ?? JSON.stringify(generated) } }] }));
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.on('listening', resolve));
  url = `http://127.0.0.1:${server.address().port}/api/lessons/generate`;
});
beforeEach(() => { responses = []; providerRequests = []; });
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
    expect(providerRequests[0].reasoning_split).toBe(true);
  });
  it('refuses an empty generated lesson instead of sending a completable page', async () => {
    generated = { title: 'Empty', exercises: [] };
    expect((await request({})).status).toBe(502);
    expect(providerRequests).toHaveLength(2);
  });
  it('recovers from a truncated answer and parses reasoning plus fenced JSON', async () => {
    const valid = { title: 'Practice', exercises: [{ type: 'translation', instruction: 'Translate', sentence: 'Hello', answer: 'Hola' }] };
    responses = [{ content: '{"title":"Prac', finishReason: 'length' }, { content: `<think>Schema { draft }</think>\n\`\`\`json\n${JSON.stringify(valid)}\n\`\`\`` }];
    expect((await request({})).status).toBe(200);
    expect(providerRequests).toHaveLength(2);
    expect(providerRequests[1].max_tokens).toBeGreaterThan(providerRequests[0].max_tokens);
  });
  it('does not retry an authentication failure', async () => {
    responses = [{ status: 401 }];
    expect((await request({})).status).toBe(500);
    expect(providerRequests).toHaveLength(1);
  });
});
