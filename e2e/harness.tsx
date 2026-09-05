/* This dev-only Vite entry is not imported by the app or included in its build. */
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Header } from '../src/components/layout/Header';
import { Dashboard } from '../src/pages/Dashboard';
import { DailyPractice } from '../src/pages/DailyPractice';
import { Vocabulary } from '../src/pages/Vocabulary';
import { ReadingLesson } from '../src/pages/ReadingLesson';
import { WritingLesson } from '../src/pages/WritingLesson';
import { SpeakingLesson } from '../src/pages/SpeakingLesson';
import { FlashcardReview } from '../src/pages/FlashcardReview';
import { useAppStore } from '../src/store/appStore';
import type { ProgressMap, WordPerformanceMap } from '../src/types/progress';
import { lessonFixture, stateFixture, words } from './fixtures';
import '../src/index.css';

declare global {
  interface Window {
    __lingoforgeTest: { snapshot: () => { progress: ProgressMap; wordPerformance: WordPerformanceMap } };
  }
}

export function LessonView() {
  const { type } = useParams();
  const { pathname } = useLocation();
  if (type === 'reading') return <ReadingLesson key={pathname} />;
  if (type === 'writing') return <WritingLesson key={pathname} />;
  return <SpeakingLesson key={pathname} />;
}

if (import.meta.env.DEV) {
  const params = new URLSearchParams(location.search);
  const scenario = params.get('scenario') ?? 'dashboard';
  const start = params.get('path') ?? '/';
  const seed = stateFixture(scenario);
  // No fake sign-in: a null uid makes the real store skip every cloud write.
  useAppStore.setState({ uid: null, language: 'spanish', hydrated: true, syncStatus: 'local', syncError: null, ...seed });
  const cache = Object.fromEntries((['reading', 'writing', 'speaking'] as const).flatMap((type) => [1, 2].map((lesson) => [`spanish-${type}-1-${lesson}`, lessonFixture(type, lesson)])));
  localStorage.setItem('lingoforge_lessons', JSON.stringify(cache));
  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init) => new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.origin).pathname.startsWith('/api/words/')
    ? Promise.resolve(Response.json(words)) : realFetch(input, init);
  window.__lingoforgeTest = { snapshot: () => {
    const { progress, wordPerformance } = useAppStore.getState();
    return JSON.parse(JSON.stringify({ progress, wordPerformance }));
  } };
  createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={[start]}><div className="min-h-screen bg-slate-950 text-white"><Header /><Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/practice/:language" element={<DailyPractice />} />
    <Route path="/vocabulary/:language" element={<Vocabulary />} />
    <Route path="/review/:language" element={<FlashcardReview />} />
    <Route path="/lesson/:language/:type/:level/:lesson" element={<LessonView />} />
  </Routes></div></MemoryRouter>);
}
