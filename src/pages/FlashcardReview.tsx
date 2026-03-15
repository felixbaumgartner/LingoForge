import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { AudioPlayer } from '../components/AudioPlayer';
import { fetchWords } from '../api/client';
import { loadFlashcardData, saveFlashcardData } from '../lib/persistence';
import { saveFlashcardsToFirestore } from '../lib/progressSync';
import type { Language, Word } from '../types/language';
import type { FlashcardData } from '../types/progress';

const CARDS_PER_SESSION = 30;

export function FlashcardReview() {
  const { language } = useParams<{ language: string }>();
  const navigate = useNavigate();
  const progress = useAppStore((s) => s.progress);
  const lang = language as Language;

  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [rated, setRated] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Get completed word ranks
  const completedWordCount = useMemo(() => {
    const langProgress = progress[lang];
    if (!langProgress) return 0;
    let maxLevel = 0;
    for (const type of ['reading', 'writing', 'speaking'] as const) {
      for (let lvl = 1; lvl <= 16; lvl++) {
        if (langProgress[type]?.[lvl]?.completed) {
          maxLevel = Math.max(maxLevel, lvl);
        }
      }
    }
    return maxLevel * 50;
  }, [progress, lang]);

  // Load words and pick session cards
  useEffect(() => {
    fetchWords(lang).then((allWords) => {
      const pool = allWords.filter((w) => w.rank <= completedWordCount);
      // Prioritize words rated 'hard' or not yet seen
      const flashcardData = loadFlashcardData().filter((f) => f.language === lang);
      const hardRanks = new Set(flashcardData.filter((f) => f.rating === 'hard').map((f) => f.wordRank));

      // Sort: hard words first, then unseen, then easy
      pool.sort((a, b) => {
        const aHard = hardRanks.has(a.rank) ? 0 : 1;
        const bHard = hardRanks.has(b.rank) ? 0 : 1;
        if (aHard !== bHard) return aHard - bHard;
        return Math.random() - 0.5;
      });

      setWords(pool.slice(0, CARDS_PER_SESSION));
    });
  }, [lang, completedWordCount]);

  if (words.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-center">
        <p className="text-slate-400">Loading flashcards...</p>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-center">
        <RotateCcw className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Session Complete!</h2>
        <p className="text-slate-400 mb-6">You reviewed {words.length} words.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setCurrentIndex(0);
              setFlipped(false);
              setRated(false);
              setSessionComplete(false);
            }}
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Review Again
          </button>
          <button onClick={() => navigate('/')} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const card = words[currentIndex];

  function handleRate(rating: 'hard' | 'moderate' | 'easy') {
    const data = loadFlashcardData();
    const existing = data.findIndex((f) => f.wordRank === card.rank && f.language === lang);
    const now = new Date().toISOString();
    const daysUntilNext = rating === 'hard' ? 1 : rating === 'moderate' ? 3 : 7;
    const nextReview = new Date(Date.now() + daysUntilNext * 86400000).toISOString();

    const entry: FlashcardData = {
      wordRank: card.rank,
      language: lang,
      rating,
      lastSeen: now,
      nextReview,
      reviewCount: existing >= 0 ? data[existing].reviewCount + 1 : 1,
    };

    if (existing >= 0) {
      data[existing] = entry;
    } else {
      data.push(entry);
    }
    saveFlashcardData(data);
    const uid = useAppStore.getState().uid;
    if (uid) saveFlashcardsToFirestore(uid, data).catch(console.error);
    setRated(true);
  }

  function handleNext() {
    if (currentIndex + 1 >= words.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
      setRated(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-white mb-8 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="mb-1.5 text-xs font-semibold text-amber-400/80 uppercase tracking-[0.15em]">
        Review &middot; {lang}
      </div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold text-white">Flashcard Review</h2>
        <span className="text-sm text-slate-500 tabular-nums font-medium">{currentIndex + 1} / {words.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-800/80 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentIndex + 1) / words.length) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #f97316)' }}
        />
      </div>

      {/* Card */}
      <button
        onClick={() => setFlipped(!flipped)}
        className="w-full glass rounded-2xl p-14 text-center hover:bg-white/[0.02] transition-all duration-300 mb-6 min-h-[260px] flex flex-col items-center justify-center relative overflow-hidden noise"
      >
        {!flipped ? (
          <>
            <p className="text-4xl font-display font-bold text-white mb-4">{card.word}</p>
            <AudioPlayer text={card.word} language={lang} />
            <p className="text-sm text-slate-500 mt-4">Tap to reveal translation</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-white mb-2">{card.word}</p>
            <p className="text-xl text-emerald-400 mb-2">{card.translation}</p>
            <p className="text-sm text-slate-500 mt-2">Tap to flip back</p>
          </>
        )}
      </button>

      {/* Rating */}
      {flipped && !rated && (
        <div className="mb-6">
          <p className="text-sm text-slate-400 text-center mb-3">How well did you know this?</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => handleRate('hard')} className="px-6 py-2.5 bg-red-600/20 border border-red-600/50 text-red-400 rounded-lg hover:bg-red-600/30">
              Hard
            </button>
            <button onClick={() => handleRate('moderate')} className="px-6 py-2.5 bg-amber-600/20 border border-amber-600/50 text-amber-400 rounded-lg hover:bg-amber-600/30">
              Moderate
            </button>
            <button onClick={() => handleRate('easy')} className="px-6 py-2.5 bg-emerald-600/20 border border-emerald-600/50 text-emerald-400 rounded-lg hover:bg-emerald-600/30">
              Easy
            </button>
          </div>
        </div>
      )}

      {rated && (
        <button
          onClick={handleNext}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
        >
          {currentIndex + 1 >= words.length ? 'Finish Session' : 'Next Card'}
        </button>
      )}
    </div>
  );
}
