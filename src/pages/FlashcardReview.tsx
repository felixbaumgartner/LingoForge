import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2, RotateCcw } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { AudioPlayer } from '../components/AudioPlayer';
import { fetchWords } from '../api/client';
import { CARDS_PER_SESSION, selectReviewWords, type ReviewFocus } from '../lib/review';
import { LANGUAGES, type Language, type Word } from '../types/language';

type Rating = 'hard' | 'moderate' | 'easy';
const RATINGS: { value: Rating; label: string; hint: string; color: string }[] = [
  {
    value: 'hard',
    label: 'Hard',
    hint: 'Review in 1 day',
    color: 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    hint: 'Review in 3 days',
    color: 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
  },
  {
    value: 'easy',
    label: 'Easy',
    hint: 'Review in 7 days',
    color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
  },
];
const TITLES: Record<ReviewFocus, string> = {
  all: 'Flashcard Review',
  weak: 'Weak Words Practice',
  due: 'Due for Review',
};
const EMPTY: Record<ReviewFocus, string> = {
  all: 'No words to review yet. Complete your first lesson to get started.',
  weak: 'No weak words to practice right now. Try reviewing all your words.',
  due: 'You’re all caught up. No words are due right now.',
};

export function FlashcardReview() {
  const { language } = useParams<{ language: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const lang = LANGUAGES.find((item) => item.id === language);
  const focusParam = searchParams.get('focus');
  const focus: ReviewFocus = focusParam === 'weak' || focusParam === 'due' ? focusParam : 'all';
  if (!lang)
    return (
      <div className="p-8 text-center">
        <p>Choose a supported language to review.</p>
        <button className="mt-4 text-emerald-400" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>
    );
  return <Review key={`${lang.id}-${focus}`} language={lang.id} focus={focus} />;
}

function Review({ language, focus }: { language: Language; focus: ReviewFocus }) {
  const navigate = useNavigate();
  const progress = useAppStore((s) => s.progress);
  const wordPerformance = useAppStore((s) => s.wordPerformance);
  const [corpus, setCorpus] = useState<Word[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState<Word[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchWords(language)
      .then((words) => {
        if (!cancelled) setCorpus(words);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [language, attempt]);

  // Keep the lobby current as cloud progress arrives; freeze the deck only on Start.
  const deck = useMemo(
    () => selectReviewWords(corpus ?? [], progress, wordPerformance, language, focus),
    [corpus, progress, wordPerformance, language, focus],
  );
  const languageLabel = LANGUAGES.find((item) => item.id === language)?.label;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>
      <p className="mb-2 text-xs font-semibold text-amber-400 uppercase tracking-[0.15em]">
        Review · {languageLabel}
      </p>
      <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-6">{TITLES[focus]}</h1>
      {session ? (
        <ReviewSession words={session} language={language} onRestart={() => setSession(null)} />
      ) : (
        <>
          <nav aria-label="Review mode" className="flex flex-wrap gap-2 mb-6">
            {(['all', 'due', 'weak'] as const).map((mode) => (
              <button
                key={mode}
                aria-current={focus === mode ? 'page' : undefined}
                onClick={() => navigate(`/review/${language}${mode === 'all' ? '' : `?focus=${mode}`}`)}
                className={`px-4 py-2 rounded-xl text-sm border transition-colors ${focus === mode ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-slate-700 text-slate-400 hover:text-white'}`}
              >
                {mode === 'all' ? 'All words' : mode === 'due' ? 'Due now' : 'Weak words'}
              </button>
            ))}
          </nav>
          <div className="glass rounded-2xl p-6 sm:p-10 text-center">
            {error ? (
              <div role="alert">
                <p className="text-red-300 mb-4">Couldn’t load your words. Please try again.</p>
                <button
                  onClick={() => {
                    setError(false);
                    setAttempt((n) => n + 1);
                  }}
                  className="px-5 py-3 bg-slate-700 rounded-xl"
                >
                  Try again
                </button>
              </div>
            ) : !corpus ? (
              <p role="status" className="text-slate-400 flex justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading your words…
              </p>
            ) : deck.length === 0 ? (
              <p role="status" className="text-slate-300">
                {EMPTY[focus]}
              </p>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 flex items-center justify-center mx-auto mb-5">
                  <RotateCcw className="w-7 h-7 text-amber-400" />
                </div>
                <h2 className="text-xl font-semibold mb-3">A little practice, lasting progress.</h2>
                <p className="text-slate-400 mb-2">
                  {deck.length} {deck.length === 1 ? 'word' : 'words'} · Reveal each answer, then rate your
                  recall.
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  {focus === 'due'
                    ? 'Scheduled reviews, oldest first.'
                    : focus === 'weak'
                      ? 'A focused session for the words you find tricky.'
                      : 'Due words first, followed by weak words and the rest.'}{' '}
                  Up to {CARDS_PER_SESSION} cards per session.
                </p>
                <button
                  onClick={() => setSession(deck)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold"
                >
                  Start review <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </>
      )}
    </main>
  );
}

function ReviewSession({
  words,
  language,
  onRestart,
}: {
  words: Word[];
  language: Language;
  onRestart: () => void;
}) {
  const navigate = useNavigate();
  const rateWord = useAppStore((s) => s.rateWord);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const ratingLock = useRef(false);
  const revealButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const firstRating = useRef<HTMLButtonElement>(null);
  const summary = useRef<HTMLHeadingElement>(null);
  const complete = index === words.length;
  const rated = ratings.length > index;
  const card = words[index];

  function handleRate(rating: Rating) {
    if (!card || !revealed || rated || ratingLock.current) return;
    ratingLock.current = true;
    rateWord(language, card.rank, card.word, card.translation, rating);
    setRatings((previous) => [...previous, rating]);
  }

  function handleNext() {
    if (!rated) return;
    setIndex((previous) => previous + 1);
    setRevealed(false);
    ratingLock.current = false;
  }

  useEffect(() => {
    if (complete) summary.current?.focus();
    else if (rated) nextButton.current?.focus();
    else if (revealed) firstRating.current?.focus();
    else revealButton.current?.focus();
  }, [index, revealed, rated, complete]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || complete)
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (revealed && !rated && ['1', '2', '3'].includes(event.key)) {
        event.preventDefault();
        handleRate(RATINGS[Number(event.key) - 1].value);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (complete)
    return (
      <section className="glass rounded-2xl p-6 sm:p-10 text-center">
        <Check className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h2 ref={summary} tabIndex={-1} className="text-2xl font-bold mb-2">
          Session complete!
        </h2>
        <p className="text-slate-400 mb-6">
          You reviewed {ratings.length} {ratings.length === 1 ? 'word' : 'words'}. Your ratings have been
          saved.
        </p>
        <dl className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          {RATINGS.map((rating) => (
            <div key={rating.value} className={`rounded-xl p-3 border ${rating.color}`}>
              <dt className="text-sm">{rating.label}</dt>
              <dd className="text-2xl font-bold tabular-nums mt-1">
                {ratings.filter((value) => value === rating.value).length}
              </dd>
            </div>
          ))}
        </dl>
        {ratings.includes('hard') && (
          <p className="text-sm text-slate-400 mb-6">
            Hard words are scheduled for tomorrow. Keep showing up — recall builds with practice.
          </p>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={onRestart} className="px-5 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl">
            Review more words
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl"
          >
            Back to Dashboard
          </button>
        </div>
      </section>
    );

  return (
    <section aria-label="Flashcard session">
      <div className="flex justify-between text-sm text-slate-400 mb-3">
        <span aria-live="polite">
          Card {index + 1} of {words.length}
        </span>
        <span>{ratings.length} reviewed</span>
      </div>
      <div
        role="progressbar"
        aria-label="Words reviewed"
        aria-valuemin={0}
        aria-valuemax={words.length}
        aria-valuenow={ratings.length}
        className="h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden"
      >
        <div
          className="h-full bg-amber-400 transition-all duration-300 motion-reduce:transition-none"
          style={{ width: `${(ratings.length / words.length) * 100}%` }}
        />
      </div>
      <div className="glass rounded-2xl p-6 sm:p-10 text-center mb-6 min-h-[280px] flex flex-col items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-slate-500 mb-4">Recall the meaning</p>
        <h2 className="text-3xl sm:text-4xl font-display font-bold text-white break-words max-w-full mb-5">
          {card.word}
        </h2>
        <AudioPlayer text={card.word} language={language} />
        {revealed ? (
          <div className="mt-6" aria-live="polite">
            <p className="text-xl text-emerald-300">{card.translation}</p>
            {card.notes && <p className="text-sm text-slate-400 mt-2">{card.notes}</p>}
          </div>
        ) : (
          <button
            ref={revealButton}
            onClick={() => setRevealed(true)}
            className="mt-6 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium"
          >
            Reveal answer
          </button>
        )}
      </div>
      {revealed && !rated && (
        <>
          <p className="text-sm text-slate-400 text-center mb-3">How well did you remember?</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
            {RATINGS.map((rating, position) => (
              <button
                ref={position === 0 ? firstRating : undefined}
                key={rating.value}
                onClick={() => handleRate(rating.value)}
                aria-keyshortcuts={String(position + 1)}
                className={`px-2 py-3 rounded-xl border transition-colors ${rating.color}`}
              >
                <span className="block font-semibold">{rating.label}</span>
                <span className="block text-[11px] sm:text-xs mt-1">{rating.hint}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 text-center">Shortcuts: 1 Hard · 2 Moderate · 3 Easy</p>
        </>
      )}
      {rated && (
        <>
          <p role="status" className="text-sm text-slate-400 text-center mb-3">
            Saved as {RATINGS.find((rating) => rating.value === ratings[index])?.label.toLowerCase()}.{' '}
            {ratings[index] === 'easy'
              ? 'This word is out of your weak list.'
              : 'Your next review is scheduled.'}
          </p>
          <button
            ref={nextButton}
            onClick={handleNext}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-xl"
          >
            {index + 1 === words.length ? 'Finish session' : 'Next card'}
          </button>
        </>
      )}
      {!revealed && (
        <p className="text-xs text-slate-500 text-center">
          Press Space or Enter on Reveal answer to check your recall.
        </p>
      )}
    </section>
  );
}
