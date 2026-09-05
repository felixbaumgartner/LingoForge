import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useLocation, Link } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { useAuth } from './hooks/useAuth';
import { useAppStore } from './store/appStore';
import { isLessonUnlocked, TOTAL_LEVELS, LESSONS_PER_LEVEL } from './lib/persistence';
import type { Language } from './types/language';
import type { LessonType } from './types/lesson';
import { Loader2 } from 'lucide-react';

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const ReadingLesson = lazy(() => import('./pages/ReadingLesson').then((module) => ({ default: module.ReadingLesson })));
const WritingLesson = lazy(() => import('./pages/WritingLesson').then((module) => ({ default: module.WritingLesson })));
const SpeakingLesson = lazy(() => import('./pages/SpeakingLesson').then((module) => ({ default: module.SpeakingLesson })));
const FlashcardReview = lazy(() => import('./pages/FlashcardReview').then((module) => ({ default: module.FlashcardReview })));
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const DailyPractice = lazy(() => import('./pages/DailyPractice').then((module) => ({ default: module.DailyPractice })));
const Vocabulary = lazy(() => import('./pages/Vocabulary').then((module) => ({ default: module.Vocabulary })));
const MissionHub = lazy(() => import('./pages/MissionHub').then((module) => ({ default: module.MissionHub })));
const MissionLesson = lazy(() => import('./pages/MissionLesson').then((module) => ({ default: module.MissionLesson })));
const MistakePractice = lazy(() => import('./pages/MistakePractice').then((module) => ({ default: module.MistakePractice })));

function MissionRouter() {
  const location = useLocation();
  return <MissionLesson key={`${location.pathname}${location.search}`} />;
}

function LoadingScreen() {
  return <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Loading your learning space"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /></div>;
}

function MissingPage({ message = 'This page could not be found.' }: { message?: string }) {
  return <div className="max-w-lg mx-auto p-8 text-center"><p className="text-slate-300 mb-5">{message}</p><Link to="/" className="text-emerald-400 underline underline-offset-4">Back to your learning path</Link></div>;
}

function LessonRouter() {
  const { language, type, level, lesson } = useParams();
  const progress = useAppStore((state) => state.progress);
  const location = useLocation();
  const levelNumber = Number(level);
  const lessonNumber = Number(lesson);
  if (!['spanish', 'french', 'dutch'].includes(language ?? '') || !['reading', 'writing', 'speaking'].includes(type ?? '')
    || !/^\d+$/.test(level ?? '') || !Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > TOTAL_LEVELS
    || !/^\d+$/.test(lesson ?? '') || !Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > LESSONS_PER_LEVEL) {
    return <MissingPage message="This lesson does not exist. Choose a lesson from your learning path." />;
  }
  if (!isLessonUnlocked(progress, language as Language, type as LessonType, levelNumber, lessonNumber)) {
    return <MissingPage message="Complete the preceding lesson on your learning path to unlock this lesson." />;
  }
  if (type === 'reading') return <ReadingLesson key={location.pathname} />;
  if (type === 'writing') return <WritingLesson key={location.pathname} />;
  return <SpeakingLesson key={location.pathname} />;
}

function PracticeRouter({ mode }: { mode: 'review' | 'practice' | 'vocabulary' }) {
  const { language } = useParams();
  const location = useLocation();
  if (!['spanish', 'french', 'dutch'].includes(language ?? '')) return <MissingPage message="Choose Spanish, French, or Dutch from your learning path." />;
  if (mode === 'review') return <FlashcardReview key={location.pathname} />;
  if (mode === 'practice') return <DailyPractice key={location.pathname} />;
  return <Vocabulary key={location.pathname} />;
}

function AppContent() {
  const { user, loading } = useAuth();
  const uid = useAppStore((state) => state.uid);
  const hydrated = useAppStore((state) => state.hydrated);
  const setUid = useAppStore((state) => state.setUid);
  const hydrateAccount = useAppStore((state) => state.hydrateAccount);
  const userId = user?.uid ?? null;

  useEffect(() => {
    setUid(userId);
    if (userId) void hydrateAccount(userId);
  }, [userId, setUid, hydrateAccount]);

  if (loading) return <LoadingScreen />;
  if (!user) return <Login />;
  // Never render another account's cached state while auth hydration is pending.
  if (uid !== user.uid || !hydrated) return <LoadingScreen />;

  return <>
    <Header />
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lesson/:language/:type/:level/:lesson" element={<LessonRouter />} />
        <Route path="/review/:language" element={<PracticeRouter mode="review" />} />
        <Route path="/practice/:language" element={<PracticeRouter mode="practice" />} />
        <Route path="/vocabulary/:language" element={<PracticeRouter mode="vocabulary" />} />
        <Route path="/missions/:language" element={<MissionHub />} />
        <Route path="/missions/:language/clinic" element={<MistakePractice />} />
        <Route path="/missions/:language/:missionId" element={<MissionRouter />} />
        <Route path="*" element={<MissingPage />} />
      </Routes>
    </Suspense>
  </>;
}

function App() {
  return <BrowserRouter><div className="min-h-screen bg-slate-950 text-white"><Suspense fallback={<LoadingScreen />}><AppContent /></Suspense></div></BrowserRouter>;
}

export default App;
