import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useLesson } from '../hooks/useLesson';
import { useAppStore } from '../store/appStore';
import { AudioPlayer } from '../components/AudioPlayer';
import { LESSONS_PER_LEVEL, TOTAL_LEVELS } from '../lib/persistence';
import type { Language } from '../types/language';
import type { SpeakingLesson as SpeakingLessonType, CorpusWord } from '../types/lesson';

type Rating = 'hard' | 'moderate' | 'easy';

export function SpeakingLesson() {
  const { language, level, lesson: lessonParam } = useParams<{ language: string; type: string; level: string; lesson: string }>();
  const navigate = useNavigate();
  const completeLesson = useAppStore((s) => s.completeLesson);
  const rateWord = useAppStore((s) => s.rateWord);
  const { lesson, isLoading, error, loadLesson } = useLesson();
  const [cardIndex, setCardIndex] = useState(0);
  const [cardRatings, setCardRatings] = useState<Record<number, Rating>>({});

  const lang = language as Language;
  const lvl = Number(level);
  const lessonNum = Number(lessonParam);

  useEffect(() => {
    if (lang && lvl && lessonNum) {
      loadLesson(lang, 'speaking', lvl, lessonNum);
      setCardIndex(0);
      setCardRatings({});
    }
  }, [lang, lvl, lessonNum, loadLesson]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center glass rounded-2xl px-12 py-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-5">
            <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
          </div>
          <p className="text-white font-medium mb-1">Generating your lesson</p>
          <p className="text-xs text-slate-500">Crafting exercises from your word list...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => loadLesson(lang, 'speaking', lvl, lessonNum)} className="px-4 py-2 bg-slate-700 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  if (!lesson || lesson.type !== 'speaking') return null;

  const data = lesson as SpeakingLessonType;
  const cards = data.pronunciationCards ?? [];
  const phrases = data.phrases ?? [];
  const dialogue = data.dialogue ?? [];
  const corpusWords: CorpusWord[] = data.corpusWords ?? [];

  const allCardsRated = cards.length > 0 && Object.keys(cardRatings).length >= cards.length;

  function handleRate(rating: Rating) {
    setCardRatings((prev) => ({ ...prev, [cardIndex]: rating }));
    // Auto-advance to next card after rating
    if (cardIndex < cards.length - 1) {
      setTimeout(() => setCardIndex(cardIndex + 1), 300);
    }
  }

  function handleComplete() {
    // Record per-word performance from self-ratings
    const corpusMap = new Map(corpusWords.map((w) => [w.word.toLowerCase(), w]));
    for (let i = 0; i < cards.length; i++) {
      const rating = cardRatings[i];
      if (!rating) continue;
      const corpus = corpusMap.get(cards[i].word.toLowerCase());
      if (corpus) {
        rateWord(lang, corpus.rank, corpus.word, corpus.translation, rating);
      }
    }

    completeLesson(lang, 'speaking', lvl, lessonNum);
    if (lessonNum < LESSONS_PER_LEVEL) {
      navigate(`/lesson/${lang}/speaking/${lvl}/${lessonNum + 1}`);
    } else if (lvl < TOTAL_LEVELS) {
      navigate(`/lesson/${lang}/speaking/${lvl + 1}/1`);
    } else {
      navigate('/');
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-white mb-8 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="mb-1.5 text-xs font-semibold text-amber-400/80 uppercase tracking-[0.15em]">
        Speaking &middot; Level {lvl}, Lesson {lessonNum} &middot; {lang}
      </div>
      <h2 className="text-2xl font-display font-bold text-white mb-8">{data.title}</h2>

      {cards.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
            Word Pronunciation ({cardIndex + 1}/{cards.length})
          </h3>

          {/* Progress dots */}
          <div className="flex gap-1.5 mb-4">
            {cards.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  cardRatings[i] === 'easy' ? 'bg-emerald-400'
                  : cardRatings[i] === 'moderate' ? 'bg-amber-400'
                  : cardRatings[i] === 'hard' ? 'bg-red-400'
                  : i === cardIndex ? 'bg-slate-400'
                  : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="glass rounded-2xl p-10 text-center relative overflow-hidden noise">
            <p className="text-4xl font-display font-bold text-white mb-3">{cards[cardIndex].word}</p>
            <p className="text-slate-400 mb-1">{cards[cardIndex].translation}</p>
            <p className="text-xs text-slate-500 mb-5 italic">{cards[cardIndex].phoneticHint}</p>
            <AudioPlayer text={cards[cardIndex].word} language={lang} />

            {/* Self-rating */}
            <div className="mt-6">
              <p className="text-xs text-slate-500 mb-3">How well can you pronounce this?</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => handleRate('hard')}
                  className={`px-5 py-2 rounded-lg border transition-colors text-sm font-medium ${
                    cardRatings[cardIndex] === 'hard'
                      ? 'border-red-500 bg-red-500/20 text-red-300'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-red-600/50 hover:text-red-400'
                  }`}
                >
                  Hard
                </button>
                <button
                  onClick={() => handleRate('moderate')}
                  className={`px-5 py-2 rounded-lg border transition-colors text-sm font-medium ${
                    cardRatings[cardIndex] === 'moderate'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-amber-600/50 hover:text-amber-400'
                  }`}
                >
                  Okay
                </button>
                <button
                  onClick={() => handleRate('easy')}
                  className={`px-5 py-2 rounded-lg border transition-colors text-sm font-medium ${
                    cardRatings[cardIndex] === 'easy'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-emerald-600/50 hover:text-emerald-400'
                  }`}
                >
                  Easy
                </button>
              </div>
            </div>

            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setCardIndex(Math.max(0, cardIndex - 1))}
                disabled={cardIndex === 0}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-30"
              >
                Previous
              </button>
              <button
                onClick={() => setCardIndex(Math.min(cards.length - 1, cardIndex + 1))}
                disabled={cardIndex === cards.length - 1}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {phrases.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Phrase Practice</h3>
          <div className="space-y-3">
            {phrases.map((p, i) => (
              <div key={i} className="bg-slate-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white font-medium">{p.phrase}</p>
                    <p className="text-sm text-slate-400">{p.translation}</p>
                    <p className="text-xs text-slate-500 mt-1">{p.context}</p>
                  </div>
                  <AudioPlayer text={p.phrase} language={lang} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dialogue.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Mini Dialogue</h3>
          <div className="bg-slate-800 rounded-xl p-5 space-y-3">
            {dialogue.map((d, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  d.speaker === 'A' ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-slate-200'
                }`}>
                  {d.speaker}
                </span>
                <div className="flex-1">
                  <p className="text-white">{d.line}</p>
                  <p className="text-xs text-slate-500">{d.translation}</p>
                </div>
                <AudioPlayer text={d.line} language={lang} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleComplete}
        disabled={!allCardsRated}
        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-amber-500/20 disabled:shadow-none flex items-center justify-center gap-2"
      >
        <CheckCircle2 className="w-5 h-5" />
        {allCardsRated ? 'Complete & Next Lesson' : `Rate all ${cards.length} words to continue`}
      </button>
    </div>
  );
}
