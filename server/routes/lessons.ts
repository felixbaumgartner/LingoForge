import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chatCompletion } from '../services/minimax.js';
import { buildLessonPrompt } from '../services/promptBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

const LANGUAGES = ['spanish', 'french', 'dutch'];
const TYPES = ['reading', 'writing', 'speaking'];
const WORDS_PER_LEVEL = 50;
const WORDS_PER_LESSON = 10;
const LESSONS_PER_LEVEL = 5;

router.post('/generate', async (req, res) => {
  const { language, type, level, lesson: lessonNum } = req.body;

  if (!LANGUAGES.includes(language)) {
    res.status(400).json({ error: `Invalid language. Choose: ${LANGUAGES.join(', ')}` });
    return;
  }
  if (!TYPES.includes(type)) {
    res.status(400).json({ error: `Invalid type. Choose: ${TYPES.join(', ')}` });
    return;
  }
  if (!level || level < 1 || level > 16) {
    res.status(400).json({ error: 'Level must be between 1 and 16' });
    return;
  }
  if (!lessonNum || lessonNum < 1 || lessonNum > LESSONS_PER_LEVEL) {
    res.status(400).json({ error: `Lesson must be between 1 and ${LESSONS_PER_LEVEL}` });
    return;
  }

  try {
    const wordsPath = path.join(__dirname, '..', 'data', 'words', `${language}.json`);
    const allWords = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

    const levelStart = (level - 1) * WORDS_PER_LEVEL;
    const lessonStart = levelStart + (lessonNum - 1) * WORDS_PER_LESSON;
    const lessonEnd = Math.min(lessonStart + WORDS_PER_LESSON, allWords.length);
    const lessonWords = allWords.slice(lessonStart, lessonEnd);

    if (lessonWords.length === 0) {
      res.status(400).json({ error: 'No words available for this lesson' });
      return;
    }

    const { system, user } = buildLessonPrompt(lessonWords, type as 'reading' | 'writing' | 'speaking', language, level);

    const response = await chatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.7, maxTokens: 4096 }
    );

    let lessonData;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        lessonData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      console.error('Failed to parse lesson JSON:', response.substring(0, 500));
      res.status(500).json({ error: 'Failed to parse generated lesson' });
      return;
    }

    res.json({
      language,
      type,
      level,
      lesson: lessonNum,
      wordRange: [lessonStart + 1, lessonEnd],
      ...lessonData,
    });
  } catch (error) {
    console.error('Lesson generation error:', error);
    res.status(500).json({ error: 'Failed to generate lesson' });
  }
});

export default router;
