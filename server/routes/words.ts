import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

const LANGUAGES = ['spanish', 'french', 'dutch'];

router.get('/:language', (req, res) => {
  const { language } = req.params;

  if (!LANGUAGES.includes(language)) {
    res.status(400).json({ error: `Invalid language. Choose: ${LANGUAGES.join(', ')}` });
    return;
  }

  const filePath = path.join(__dirname, '..', 'data', 'words', `${language}.json`);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: `Word list not found for ${language}` });
    return;
  }

  const words = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  res.json(words);
});

export default router;
