import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import wordsRouter from './routes/words.js';
import lessonsRouter from './routes/lessons.js';
import ttsRouter from './routes/tts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/words', wordsRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/tts', ttsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`LingoForge server running on http://localhost:${PORT}`);
});
