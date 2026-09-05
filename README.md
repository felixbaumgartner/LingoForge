# LingoForge

Practice Spanish, French, and Dutch through short daily sessions, contextual reading, writing, and pronunciation practice.

**Live:** [lingoforge-orcin.vercel.app](https://lingoforge-orcin.vercel.app)

## Learning experience

- **Daily practice:** Ten-word sessions combine recognition and typed recall. Due and weak words take priority, while new words and least-recently-practiced words keep sessions moving forward. Ambiguous translation cues use recognition questions.
- **Useful feedback:** Check answers, see corrections, and retry missed or assisted words. First-attempt results remain separate from correction practice.
- **Three available skill tracks:** Start reading, writing, or speaking immediately; continue sequentially within each track across 16 levels and five lessons per level.
- **Contextual lessons:** AI-generated passages and exercises use target vocabulary in natural sentences, with objectives and explanations. Writing supports explicitly accepted alternatives and keeps meaningful accent distinctions.
- **Personal vocabulary:** Search target words and English meanings, filter due or unpracticed words, hear pronunciation, and inspect review dates.
- **Review scheduling:** Successful due reviews grow their intervals; difficult words return sooner. Flashcards show the actual next interval before a rating is saved. This is a simple adaptive scheduler, not a validated FSRS implementation.
- **Honest progress:** Set a daily goal of 5, 10, or 20 distinct words. Speaking ratings and the Strong recall label are study signals, not certified proficiency or automated pronunciation assessments.
- **Account-scoped progress:** Google sign-in and Firestore synchronization, with per-account local storage, visible sync status, and retry after connection failures.
- **Accessible controls:** Keyboard practice, visible focus, reduced motion support, and responsive desktop/mobile layouts.

The word lists currently contain 800 Spanish entries and 799 each for French and Dutch. Browser speech synthesis supplies pronunciation; voice availability depends on the device.

## Development

Use Node.js 22.12+ (Node.js 24 is used in CI), a MiniMax API key, and a Firebase project with Google Authentication and Firestore enabled.

```bash
git clone https://github.com/felixbaumgartner/LingoForge.git
cd LingoForge
npm install
cp .env.example .env
# Configure MiniMax and Firebase using .env.example.
npm run dev
```

Vite runs at `http://localhost:5173`; Express runs at `http://localhost:3001`.

| Command | Purpose |
|---|---|
| `npm run dev` | Frontend and local API |
| `npm run build` | TypeScript check and production build |
| `npm run lint` | ESLint |
| `npm test` | Unit and regression tests |
| `npm run test:e2e` | Browser integration tests |

Browser tests use installed Chrome on Windows and Playwright Chromium elsewhere (`npx playwright install --with-deps chromium`). The development-only harness renders real pages with deterministic lesson fixtures and local-only progress. It does not sign into Google, call the AI provider, or verify production Firestore permissions. Its fixtures are not bundled into the production application.

## Architecture

React 19, TypeScript, Vite, Tailwind CSS, Zustand, Express, Firebase, and MiniMax. Pages load on demand. `shared/lessonContract.js` supplies generation prompts and runtime lesson validation to both the local API and Vercel function. Clients validate cached and fetched lessons and cancel stale requests.

Account storage and synchronization live in `src/lib/accountStorage.ts`, `src/lib/progressSync.ts`, and `src/store/appStore.ts`. Firestore transactions merge progress rather than replacing a stale remote snapshot. Concurrent counters for the same word use conservative maxima, not an event log, so simultaneous offline practice on multiple devices can undercount attempts.

Vercel serves `dist` and `api/index.js`; pushes to the connected main branch trigger production deployment. GitHub Actions runs lint, unit tests, the production build, and browser tests.

## Learning design

The design draws on retrieval practice with feedback and a balance of meaning-focused input, output, and language-focused study. See [Nation's Four Strands](https://openaccess.wgtn.ac.nz/articles/journal_contribution/The_four_strands/12552167) and [Retrieval Practice: feedback](https://www.retrievalpractice.org/feedback/). These principles guide the product; they do not establish measured learning gains for this app.

See [TODOS.md](./TODOS.md) for remaining work.
