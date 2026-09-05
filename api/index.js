import { buildLessonPrompt, isLessonContent } from '../shared/lessonContract.js';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// --- Minimax service ---
const API_KEY = process.env.MINIMAX_API_KEY;
const BASE_URL = 'https://api.minimax.io/v1';

async function chatCompletion(messages, options = {}) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(55000),
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'minimax-m2.5',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Minimax chat error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function textToSpeech(text, language, speed = 1.0) {
  const res = await fetch(`${BASE_URL}/t2a_v2`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'speech-2.8-hd',
      text,
      voice_setting: { voice_id: 'male-qn-qingse', speed, pitch: 0 },
      audio_setting: { format: 'mp3', sample_rate: 32000 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Minimax TTS error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  if (data.audio_file) return Buffer.from(data.audio_file, 'base64');
  if (data.data?.audio) return Buffer.from(data.data.audio, 'base64');
  throw new Error('No audio data in TTS response');
}

// --- Routes ---
const LANGUAGES = ['spanish', 'french', 'dutch'];
const TYPES = ['reading', 'writing', 'speaking'];
const WORDS_PER_LEVEL = 50;
const WORDS_PER_LESSON = 10;
const LESSONS_PER_LEVEL = 5;

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Words
app.get('/api/words/:language', (req, res) => {
  const { language } = req.params;
  if (!LANGUAGES.includes(language)) {
    return res.status(400).json({ error: 'Invalid language' });
  }
  const filePath = path.join(__dirname, '..', 'server', 'data', 'words', `${language}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Word list not found' });
  }
  const words = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  res.json(words);
});

// Lesson generation
app.post('/api/lessons/generate', async (req, res) => {
  const { language, type, level, lesson: lessonNum } = req.body;
  if (!LANGUAGES.includes(language)) return res.status(400).json({ error: 'Invalid language' });
  if (!TYPES.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (!Number.isInteger(level) || level < 1 || level > 16) return res.status(400).json({ error: 'Invalid level' });
  if (!Number.isInteger(lessonNum) || lessonNum < 1 || lessonNum > LESSONS_PER_LEVEL) return res.status(400).json({ error: 'Invalid lesson' });

  try {
    const wordsPath = path.join(__dirname, '..', 'server', 'data', 'words', `${language}.json`);
    const allWords = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));
    const levelStart = (level - 1) * WORDS_PER_LEVEL;
    const lessonStart = levelStart + (lessonNum - 1) * WORDS_PER_LESSON;
    const lessonEnd = Math.min(lessonStart + WORDS_PER_LESSON, allWords.length);
    const lessonWords = allWords.slice(lessonStart, lessonEnd);

    if (lessonWords.length === 0) return res.status(400).json({ error: 'No words available' });

    const { system, user } = buildLessonPrompt(lessonWords, type, language, level);
    const response = await chatCompletion(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      { temperature: 0.7, maxTokens: 4096 }
    );

    let lessonData;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) lessonData = JSON.parse(jsonMatch[0]);
      else throw new Error('No JSON found');
    } catch {
      return res.status(500).json({ error: 'Failed to parse generated lesson' });
    }

    if (!isLessonContent(lessonData, type)) return res.status(502).json({ error: 'The lesson was incomplete. Please try again.' });
    res.json({ ...lessonData, language, type, level, lesson: lessonNum, wordRange: [lessonStart + 1, lessonEnd], corpusWords: lessonWords.map(({rank, word, translation}) => ({rank, word, translation})) });
  } catch (error) {
    console.error('Lesson generation error:', error);
    res.status(500).json({ error: 'Failed to generate lesson' });
  }
});

// TTS
app.post('/api/tts/synthesize', async (req, res) => {
  const { text, language, speed } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  if (!LANGUAGES.includes(language)) return res.status(400).json({ error: 'Invalid language' });

  try {
    const audioBuffer = await textToSpeech(text, language, speed ?? 1.0);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', String(audioBuffer.length));
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

export default app;
