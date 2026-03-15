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

// --- Prompt builder ---
let cachedTechniques = null;
function getTechniques() {
  if (cachedTechniques) return cachedTechniques;
  const filePath = path.join(__dirname, '..', 'server', 'data', 'techniques.json');
  if (fs.existsSync(filePath)) {
    cachedTechniques = fs.readFileSync(filePath, 'utf-8');
    return cachedTechniques;
  }
  return '[]';
}

function buildLessonPrompt(words, type, language, level) {
  const techniques = getTechniques();
  const wordList = words.map((w) => `${w.word} (${w.translation})`).join(', ');
  const languageName = language.charAt(0).toUpperCase() + language.slice(1);

  const baseSystem = `You are an expert ${languageName} language teacher. You create engaging, practical lessons.

Use these proven learning techniques from the book "How to Learn a Language in 5 Days":
${techniques}

Important rules:
- Use ONLY the vocabulary words provided below in your exercises
- Target language: ${languageName}
- Lesson level: ${level} (1=beginner, 16=advanced)
- All instructions and translations should be in English
- Return valid JSON only, no markdown or extra text`;

  if (type === 'reading') {
    return {
      system: baseSystem,
      user: `Create a reading lesson using these ${languageName} words: ${wordList}

Return JSON in this exact format:
{
  "title": "Lesson title in English",
  "passage": "A short paragraph (4-6 sentences) in ${languageName} using as many of the words as naturally possible",
  "passageTranslation": "English translation of the passage",
  "vocabulary": [
    { "word": "${languageName} word", "translation": "English meaning", "exampleSentence": "A sentence using the word in ${languageName}", "exampleTranslation": "English translation" }
  ],
  "questions": [
    { "question": "Comprehension question in English about the passage", "options": ["A) option", "B) option", "C) option", "D) option"], "correctIndex": 0 }
  ]
}

Include 8-10 vocabulary items and 4 comprehension questions.`,
    };
  }

  if (type === 'writing') {
    return {
      system: baseSystem,
      user: `Create a writing lesson using these ${languageName} words: ${wordList}

Return JSON in this exact format:
{
  "title": "Lesson title in English",
  "exercises": [
    { "type": "fill-in-blank", "instruction": "Fill in the blank with the correct ${languageName} word", "sentence": "Sentence with _____ for the blank", "answer": "correct word", "hint": "English translation of the answer" },
    { "type": "translation", "instruction": "Translate to ${languageName}", "sentence": "English sentence to translate", "answer": "Correct ${languageName} translation" },
    { "type": "word-order", "instruction": "Arrange the words to form a correct sentence", "words": ["shuffled", "words", "here"], "answer": "Correct sentence in order" },
    { "type": "multiple-choice", "instruction": "What does this word mean?", "word": "${languageName} word", "options": ["meaning1", "meaning2", "meaning3", "meaning4"], "correctIndex": 0 }
  ]
}

Include 3 fill-in-blank, 2 translation, 2 word-order, and 3 multiple-choice exercises (10 total).`,
    };
  }

  return {
    system: baseSystem,
    user: `Create a speaking/pronunciation lesson using these ${languageName} words: ${wordList}

Return JSON in this exact format:
{
  "title": "Lesson title in English",
  "pronunciationCards": [
    { "word": "${languageName} word", "translation": "English meaning", "phoneticHint": "Approximate pronunciation guide" }
  ],
  "phrases": [
    { "phrase": "A useful phrase in ${languageName}", "translation": "English translation", "context": "When to use this phrase" }
  ],
  "dialogue": [
    { "speaker": "A", "line": "${languageName} dialogue line", "translation": "English translation" }
  ]
}

Include 10 pronunciation cards, 5 phrases, and a 6-line dialogue.`,
  };
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
  if (!level || level < 1 || level > 16) return res.status(400).json({ error: 'Invalid level' });
  if (!lessonNum || lessonNum < 1 || lessonNum > LESSONS_PER_LEVEL) return res.status(400).json({ error: 'Invalid lesson' });

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

    res.json({ language, type, level, lesson: lessonNum, wordRange: [lessonStart + 1, lessonEnd], ...lessonData });
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
