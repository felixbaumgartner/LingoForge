import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useCorpus } from '../hooks/useCorpus';
import { AudioPlayer } from '../components/AudioPlayer';
import { getWordStatus } from '../lib/learning';
import { wordPerfKey } from '../lib/persistence';
import { LANGUAGES, type Language } from '../types/language';

type Filter = 'all' | 'new' | 'learning' | 'mastered' | 'due';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All words' },
  { id: 'learning', label: 'Learning' },
  { id: 'due', label: 'Due now' },
  { id: 'mastered', label: 'Strong recall' },
  { id: 'new', label: 'Not practiced' },
];
const STATUS = {
  new: { label: 'Not practiced', color: 'text-slate-400 bg-slate-800' },
  learning: { label: 'Learning', color: 'text-amber-200 bg-amber-400/10' },
  mastered: { label: 'Strong recall', color: 'text-emerald-200 bg-emerald-400/10' },
};
const normalizeSearch = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function Vocabulary() {
  const { language } = useParams();
  const navigate = useNavigate();
  const lang = LANGUAGES.find((item) => item.id === language);
  if (!lang)
    return (
      <main id="main-content" className="p-8 text-center">
        <h1 className="text-xl font-semibold mb-4">Choose a supported language</h1>
        <button className="primary-button" onClick={() => navigate('/')}>
          Back to dashboard
        </button>
      </main>
    );
  return <WordCollection key={lang.id} language={lang.id} label={lang.label} />;
}

function WordCollection({ language, label }: { language: Language; label: string }) {
  const navigate = useNavigate();
  const { words, loading, error, retry } = useCorpus(language);
  const wordPerformance = useAppStore((s) => s.wordPerformance);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(40);
  const [sort, setSort] = useState<'frequency' | 'alphabetical'>('frequency');
  const now = new Date().toISOString();
  const dueCount = words.filter(
    (word) => wordPerformance[wordPerfKey(language, word.rank)]?.nextReview <= now,
  ).length;
  const matches = useMemo(() => {
    const search = normalizeSearch(query.trim());
    return words
      .filter((word) => {
        const performance = wordPerformance[wordPerfKey(language, word.rank)];
        const status = getWordStatus(performance);
        return (
          (filter === 'all' || (filter === 'due' ? performance?.nextReview <= now : status === filter)) &&
          (!search || normalizeSearch(`${word.word} ${word.translation}`).includes(search))
        );
      })
      .sort((a, b) =>
        sort === 'frequency'
          ? a.rank - b.rank
          : a.word.localeCompare(b.word, { spanish: 'es', french: 'fr', dutch: 'nl' }[language]),
      );
  }, [words, wordPerformance, language, query, filter, sort, now]);

  return (
    <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-7"
      >
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </button>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
        <div>
          <p className="eyebrow mb-3">Your word collection · {label}</p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            Make every word yours.
          </h1>
          <p className="text-slate-400 mt-3">
            Search meanings, hear pronunciation, and follow your progress.
          </p>
        </div>
        <button
          onClick={() => navigate(`/practice/${language}`)}
          className="primary-button self-start sm:self-auto"
        >
          Practice words <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      {dueCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-amber-300/15 bg-amber-300/5 mb-6">
          <p className="text-sm text-amber-100">
            {dueCount} {dueCount === 1 ? 'word is' : 'words are'} ready for another review.
          </p>
          <button
            onClick={() => navigate(`/review/${language}?focus=due`)}
            className="inline-flex items-center gap-2 text-sm text-amber-300 font-medium"
          >
            Review due words <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
      <section aria-label="Find vocabulary" className="surface-card rounded-2xl p-4 sm:p-5 mb-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search aria-hidden="true" className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <label htmlFor="word-search" className="sr-only">
              Search words or English meanings
            </label>
            <input
              id="word-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(40);
              }}
              placeholder={`Search ${label} or English…`}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/50 py-3 pl-10 pr-10 text-sm text-white placeholder:text-slate-500"
            />
            {query && (
              <button
                aria-label="Clear search"
                onClick={() => {
                  setQuery('');
                  setLimit(40);
                }}
                className="absolute right-2 top-2 p-2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 text-sm text-slate-400">
            <SlidersHorizontal className="w-4 h-4" />
            <span className="sr-only">Sort words</span>
            <select
              aria-label="Sort words"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as 'frequency' | 'alphabetical');
                setLimit(40);
              }}
              className="bg-transparent py-3 text-slate-200"
            >
              <option value="frequency">Frequency order</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              aria-pressed={filter === item.id}
              onClick={() => {
                setFilter(item.id);
                setLimit(40);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${filter === item.id ? 'bg-emerald-300/10 text-emerald-200 border border-emerald-300/30' : 'border border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>
      {loading ? (
        <p role="status" className="flex items-center justify-center gap-2 py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Opening your collection…
        </p>
      ) : error ? (
        <div role="alert" className="surface-card text-center rounded-2xl p-10">
          <p className="text-slate-300 mb-4">We couldn’t load your word collection.</p>
          <button onClick={retry} className="primary-button">
            Try again
          </button>
        </div>
      ) : (
        <>
          <p role="status" className="text-xs text-slate-500 mb-4">
            {matches.length} {matches.length === 1 ? 'word' : 'words'}
            {query ? ` matching “${query}”` : ` in ${label}`}
            {matches.length > limit ? ` · Showing ${limit}` : ''}
          </p>
          {matches.length === 0 ? (
            <div className="surface-card rounded-2xl px-6 py-14 text-center">
              <BookOpen className="w-9 h-9 text-slate-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">
                {filter === 'due' && !query ? 'All caught up.' : 'No words found.'}
              </h2>
              <p className="text-sm text-slate-400 mb-5">
                {filter === 'due' && !query
                  ? 'Your next reviews will appear here when they’re due.'
                  : 'Try another word or choose a different filter.'}
              </p>
              <button
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                  setLimit(40);
                }}
                className="text-emerald-300 text-sm font-medium"
              >
                Show all words
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {matches.slice(0, limit).map((word) => {
                const performance = wordPerformance[wordPerfKey(language, word.rank)];
                const status = STATUS[getWordStatus(performance)];
                const attempts = performance ? performance.timesCorrect + performance.timesIncorrect : 0;
                const due = performance?.nextReview <= now;
                return (
                  <article key={word.rank} className="surface-card rounded-2xl p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h2
                            className="font-display font-semibold text-lg break-words"
                            lang={{ spanish: 'es', french: 'fr', dutch: 'nl' }[language]}
                          >
                            {word.word}
                          </h2>
                          <span className="text-[10px] text-slate-600 tabular-nums">#{word.rank}</span>
                        </div>
                        <p className="text-sm text-slate-400 break-words leading-relaxed">
                          {word.translation}
                        </p>
                      </div>
                      <AudioPlayer text={word.word} language={language} size="sm" />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-medium px-2 py-1 rounded-md ${due ? 'text-sky-200 bg-sky-300/10' : status.color}`}
                      >
                        {due ? 'Due for review' : status.label}
                      </span>
                      {attempts > 0 && (
                        <span className="text-[11px] text-slate-500">
                          {performance.timesCorrect}/{attempts} correct
                        </span>
                      )}
                    </div>
                    {(word.notes || attempts > 0) && (
                      <details className="mt-3 pt-3 border-t border-slate-800">
                        <summary className="cursor-pointer list-none text-xs text-slate-500 hover:text-slate-300 flex items-center justify-between">
                          Word details <ChevronDown className="w-3 h-3" />
                        </summary>
                        <div className="text-xs text-slate-400 mt-3 space-y-2">
                          {word.notes && <p>{word.notes}</p>}
                          {performance && (
                            <>
                              <p>
                                Last practiced:{' '}
                                {new Date(performance.lastSeen).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                              <p>
                                Next review:{' '}
                                {due
                                  ? 'Ready now'
                                  : new Date(performance.nextReview).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                              </p>
                            </>
                          )}
                        </div>
                      </details>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {matches.length > limit && (
            <div className="text-center mt-6">
              <button
                onClick={() => setLimit((count) => count + 40)}
                className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-medium hover:bg-slate-800"
              >
                Show more words ({matches.length - limit} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
