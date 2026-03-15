import { Router } from 'express';
import { textToSpeech } from '../services/minimax.js';

const router = Router();

const LANGUAGES = ['spanish', 'french', 'dutch'];

router.post('/synthesize', async (req, res) => {
  const { text, language, speed } = req.body;

  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Text is required' });
    return;
  }
  if (!LANGUAGES.includes(language)) {
    res.status(400).json({ error: `Invalid language. Choose: ${LANGUAGES.join(', ')}` });
    return;
  }

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

export default router;
