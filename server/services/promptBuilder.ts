import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Word {
  rank: number;
  word: string;
  translation: string;
}

let cachedTechniques: string | null = null;

function getTechniques(): string {
  if (cachedTechniques) return cachedTechniques;
  const filePath = path.join(__dirname, '..', 'data', 'techniques.json');
  if (fs.existsSync(filePath)) {
    cachedTechniques = fs.readFileSync(filePath, 'utf-8');
    return cachedTechniques;
  }
  return '[]';
}

export function buildLessonPrompt(
  words: Word[],
  type: 'reading' | 'writing' | 'speaking',
  language: string,
  level: number
): { system: string; user: string } {
  const techniques = getTechniques();
  const wordList = words.map((w) => `${w.word} (${w.translation})`).join(', ');

  const languageName =
    language.charAt(0).toUpperCase() + language.slice(1);

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
    {
      "question": "Comprehension question in English about the passage",
      "options": ["A) option", "B) option", "C) option", "D) option"],
      "correctIndex": 0
    }
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
    {
      "type": "fill-in-blank",
      "instruction": "Fill in the blank with the correct ${languageName} word",
      "sentence": "Sentence with _____ for the blank",
      "answer": "correct word",
      "hint": "English translation of the answer"
    },
    {
      "type": "translation",
      "instruction": "Translate to ${languageName}",
      "sentence": "English sentence to translate",
      "answer": "Correct ${languageName} translation"
    },
    {
      "type": "word-order",
      "instruction": "Arrange the words to form a correct sentence",
      "words": ["shuffled", "words", "here"],
      "answer": "Correct sentence in order"
    },
    {
      "type": "multiple-choice",
      "instruction": "What does this word mean?",
      "word": "${languageName} word",
      "options": ["meaning1", "meaning2", "meaning3", "meaning4"],
      "correctIndex": 0
    }
  ]
}

Include 3 fill-in-blank, 2 translation, 2 word-order, and 3 multiple-choice exercises (10 total).`,
    };
  }

  // Speaking
  return {
    system: baseSystem,
    user: `Create a speaking/pronunciation lesson using these ${languageName} words: ${wordList}

Return JSON in this exact format:
{
  "title": "Lesson title in English",
  "pronunciationCards": [
    {
      "word": "${languageName} word",
      "translation": "English meaning",
      "phoneticHint": "Approximate pronunciation guide"
    }
  ],
  "phrases": [
    {
      "phrase": "A useful phrase in ${languageName}",
      "translation": "English translation",
      "context": "When to use this phrase"
    }
  ],
  "dialogue": [
    {
      "speaker": "A",
      "line": "${languageName} dialogue line",
      "translation": "English translation"
    }
  ]
}

Include 10 pronunciation cards, 5 phrases, and a 6-line dialogue.`,
  };
}
