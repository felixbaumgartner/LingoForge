# LingoForge

An AI-powered language learning app that adapts to how you learn. Master 800 words in Spanish, French, or Dutch through reading, writing, and speaking exercises — with per-word performance tracking that identifies your weak spots.

**Live:** [lingoforge-orcin.vercel.app](https://lingoforge-orcin.vercel.app)

## Features

- **AI-Generated Lessons** — Every lesson is dynamically created using MiniMax AI, so no two sessions are exactly alike
- **Three Skill Types** — Reading (passages + comprehension), Writing (fill-in-blank, translation, word-order), Speaking (pronunciation cards with audio)
- **Per-Word Performance Tracking** — Tracks every word you get right or wrong across all lesson types, building a detailed picture of your vocabulary mastery
- **Word Mastery Dashboard** — See your mastered, learning, and struggling words at a glance with accuracy percentages
- **Weak Words Practice** — One-tap focused flashcard sessions targeting only the words you struggle with
- **Spaced Repetition (SRS)** — Words you get wrong come back sooner; words you master get longer intervals before review
- **Text-to-Speech** — Listen to native pronunciation for every word, phrase, and passage
- **Structured Progression** — 16 levels x 5 lessons per skill type, with sequential unlocking
- **Firebase Auth & Sync** — Sign in with Google, progress syncs across devices via Firestore

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Zustand
- **Backend:** Express 5, Node.js
- **AI:** MiniMax API (lesson generation + TTS)
- **Auth & Storage:** Firebase Authentication, Cloud Firestore
- **Deployment:** Vercel (static + serverless)
- **Testing:** Vitest (32 unit tests)

## Getting Started

### Prerequisites

- Node.js 18+
- A [MiniMax](https://www.minimax.io/) API key
- A [Firebase](https://firebase.google.com/) project with Authentication and Firestore enabled

### Setup

```bash
# Clone the repo
git clone https://github.com/felixbaumgartner/LingoForge.git
cd LingoForge

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Add your MINIMAX_API_KEY and Firebase config to .env

# Start development server (client + API server)
npm run dev
```

The app runs at `http://localhost:5173` (Vite) with the API server at `http://localhost:3001`.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client + server concurrently |
| `npm run dev:client` | Start Vite dev server only |
| `npm run dev:server` | Start Express API server only |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | Run ESLint |
| `npx vitest run` | Run unit tests |

## Project Structure

```
LingoForge/
├── server/                  # Express API server
│   ├── routes/
│   │   ├── lessons.ts       # AI lesson generation endpoint
│   │   ├── words.ts         # Word corpus endpoint
│   │   └── tts.ts           # Text-to-speech endpoint
│   ├── services/
│   │   ├── minimax.ts       # MiniMax API client
│   │   └── promptBuilder.ts # Lesson prompt templates
│   └── data/words/          # Word corpora (800 words per language)
├── src/
│   ├── api/client.ts        # Frontend API client
│   ├── components/
│   │   ├── WeakWords.tsx     # Word mastery dashboard card
│   │   ├── AudioPlayer.tsx   # TTS audio player
│   │   ├── LanguageSelector.tsx
│   │   └── ProgressBar.tsx
│   ├── hooks/
│   │   ├── useLesson.ts     # Lesson loading with cache
│   │   ├── useAuth.ts       # Firebase auth hook
│   │   └── useAudio.ts      # Audio playback hook
│   ├── lib/
│   │   ├── persistence.ts   # WordPerformance CRUD, SRS, localStorage
│   │   ├── progressSync.ts  # Firestore sync + merge logic
│   │   ├── firebase.ts      # Firebase config
│   │   └── __tests__/       # Unit tests
│   ├── pages/
│   │   ├── Dashboard.tsx     # Main dashboard with progress + word mastery
│   │   ├── ReadingLesson.tsx # Reading passage + comprehension + vocab quiz
│   │   ├── WritingLesson.tsx # Fill-in-blank, translation, word-order exercises
│   │   ├── SpeakingLesson.tsx# Pronunciation cards with self-rating
│   │   ├── FlashcardReview.tsx # Flashcard review (all words or weak-only)
│   │   └── Login.tsx
│   ├── store/appStore.ts    # Zustand state (progress + word performance)
│   └── types/               # TypeScript interfaces
└── TODOS.md                 # Roadmap (Phase 2: adaptive AI, SRS, unlock system)
```

## How It Works

### Lesson Generation

Each lesson is generated on-the-fly by the MiniMax AI. The server slices 10 words from the 800-word corpus based on the level and lesson number, then prompts the AI to create exercises using those words.

### Per-Word Tracking

Every interaction records performance at the word level:
- **Reading:** Vocab quiz after comprehension (word-to-translation matching)
- **Writing:** Each exercise maps to a specific corpus word (correct/incorrect)
- **Speaking:** Self-rating per pronunciation card (hard/okay/easy)
- **Flashcards:** Self-rating feeds the same unified data model

### Word Mastery Categories

| Category | Criteria |
|----------|----------|
| Mastered | 80%+ accuracy with 2+ correct streak |
| Learning | 50-79% accuracy |
| Struggling | Below 50% accuracy |

## Roadmap

See [TODOS.md](./TODOS.md) for the full roadmap:

- **Phase 2:** Adaptive AI lesson generation — feed weak words into prompts so lessons target your gaps
- **Unlock system loosening** — unlock Writing/Speaking based on word mastery, not just level completion
- **Full SM-2 algorithm** — replace basic SRS intervals with the industry-standard spaced repetition algorithm

## License

MIT
