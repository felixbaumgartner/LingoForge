import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { ReadingLesson } from './pages/ReadingLesson';
import { WritingLesson } from './pages/WritingLesson';
import { SpeakingLesson } from './pages/SpeakingLesson';
import { FlashcardReview } from './pages/FlashcardReview';
import { Login } from './pages/Login';
import { useAuth } from './hooks/useAuth';
import { useAppStore } from './store/appStore';
import { loadProgressFromFirestore, loadWordPerfFromFirestore, mergeWordPerformance } from './lib/progressSync';
import { loadProgress, saveProgress, loadWordPerformance, saveWordPerformance } from './lib/persistence';
import { Loader2 } from 'lucide-react';

function LessonRouter() {
  const { type } = useParams<{ type: string }>();
  if (type === 'reading') return <ReadingLesson />;
  if (type === 'writing') return <WritingLesson />;
  if (type === 'speaking') return <SpeakingLesson />;
  return <div className="p-8 text-center text-slate-400">Unknown lesson type</div>;
}

function AppContent() {
  const { user, loading } = useAuth();
  const setUid = useAppStore((s) => s.setUid);
  const setProgress = useAppStore((s) => s.setProgress);
  const setWordPerformance = useAppStore((s) => s.setWordPerformance);

  useEffect(() => {
    if (user) {
      setUid(user.uid);
      // Load progress from Firestore and merge with localStorage
      loadProgressFromFirestore(user.uid).then((firestoreProgress) => {
        if (firestoreProgress) {
          const localProgress = loadProgress();
          const merged = mergeProgress(localProgress, firestoreProgress);
          setProgress(merged);
        }
      }).catch(console.error);
      // Load word performance from Firestore and merge
      loadWordPerfFromFirestore(user.uid).then((remoteWp) => {
        if (remoteWp) {
          const localWp = loadWordPerformance();
          const merged = mergeWordPerformance(localWp, remoteWp);
          saveWordPerformance(merged);
          setWordPerformance(merged);
        }
      }).catch(console.error);
    } else {
      setUid(null);
    }
  }, [user, setUid, setProgress, setWordPerformance]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lesson/:language/:type/:level/:lesson" element={<LessonRouter />} />
        <Route path="/review/:language" element={<FlashcardReview />} />
      </Routes>
    </>
  );
}

// Merge local and Firestore progress — take the most complete version
function mergeProgress(local: Record<string, any>, remote: Record<string, any>): any {
  const result = { ...local };
  for (const lang of ['spanish', 'french', 'dutch']) {
    if (!remote[lang]) continue;
    if (!result[lang]) {
      result[lang] = remote[lang];
      continue;
    }
    for (const type of ['reading', 'writing', 'speaking']) {
      if (!remote[lang][type]) continue;
      if (!result[lang][type]) {
        result[lang][type] = remote[lang][type];
        continue;
      }
      // Merge individual lesson completions — completed wins
      for (const key of Object.keys(remote[lang][type])) {
        if (remote[lang][type][key]?.completed && !result[lang][type][key]?.completed) {
          result[lang][type][key] = remote[lang][type][key];
        }
      }
    }
  }
  // Save merged result back to localStorage
  saveProgress(result);
  return result;
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-white">
        <AppContent />
      </div>
    </BrowserRouter>
  );
}

export default App;
