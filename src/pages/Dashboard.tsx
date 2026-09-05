import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleCheck,
  Clock3,
  Headphones,
  Layers3,
  LockKeyhole,
  Mic,
  Pencil,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { LanguageSelector } from '../components/LanguageSelector';
import { useStudyGoal } from '../hooks/useStudyGoal';
import { useCorpus } from '../hooks/useCorpus';
import { getNextLesson, getLessonCount, getTodayPracticeCount, getWordStatus } from '../lib/learning';
import {
  getCompletedLessonsInLevel,
  getWeakWords,
  getWordsDueForReview,
  isLessonUnlocked,
  LESSONS_PER_LEVEL,
  TOTAL_LEVELS,
} from '../lib/persistence';
import { getReviewableRanks } from '../lib/review';
import { LANGUAGES, type Language } from '../types/language';
import type { LessonType } from '../types/lesson';

const TRACKS = [
  {
    type: 'reading' as const,
    label: 'Reading',
    verb: 'Read in context',
    description: 'Short passages. Everyday meaning.',
    icon: BookOpen,
    color: 'text-emerald-300',
    tint: 'bg-emerald-400/10',
    border: 'border-emerald-400/30',
  },
  {
    type: 'writing' as const,
    label: 'Writing',
    verb: 'Put it into words',
    description: 'Build sentences and get feedback.',
    icon: Pencil,
    color: 'text-violet-300',
    tint: 'bg-violet-400/10',
    border: 'border-violet-400/30',
  },
  {
    type: 'speaking' as const,
    label: 'Speaking',
    verb: 'Say it out loud',
    description: 'Listen, repeat, and build confidence.',
    icon: Mic,
    color: 'text-amber-300',
    tint: 'bg-amber-400/10',
    border: 'border-amber-400/30',
  },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { language, setLanguage, progress, wordPerformance } = useAppStore();
  const { words } = useCorpus(language);
  const { goal, setGoal } = useStudyGoal();
  const today = getTodayPracticeCount(wordPerformance, language);
  const goalReached = today >= goal;
  const languageName = LANGUAGES.find((item) => item.id === language)?.label;
  const due = getWordsDueForReview(wordPerformance, language);
  const weak = getWeakWords(wordPerformance, language, 4);
  const ranks = getReviewableRanks(progress, wordPerformance, language);
  const encountered = words.length ? words.filter((word) => ranks.has(word.rank)).length : ranks.size;
  const mastered = Object.values(wordPerformance).filter(
    (word) => word.language === language && getWordStatus(word) === 'mastered',
  ).length;
  const lessonCount = TRACKS.reduce((sum, track) => sum + getLessonCount(progress, language, track.type), 0);
  const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(
    new Date(),
  );

  return (
    <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <p className="eyebrow mb-3">
            Your learning space <span className="text-slate-600 mx-2">/</span> {dateLabel}
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            A little closer, every day.
          </h1>
          <p className="text-slate-400 mt-3">
            Make {languageName} part of your day. Pick up where you left off.
          </p>
        </div>
        <LanguageSelector selected={language} onChange={setLanguage} />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 mb-10">
        <section className="study-hero rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 mb-7">
              <Sparkles className="w-3.5 h-3.5" /> YOUR DAILY PRACTICE
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-tight tracking-tight mb-4">
              Small session.
              <br />
              <span className="text-emerald-300">Stronger recall.</span>
            </h2>
            <p className="text-slate-300 max-w-md leading-relaxed mb-6">
              {encountered === 0
                ? 'Meet your first words, then put them to the test. Your first practice session is ready.'
                : 'A focused mix of meaning and writing. Practice the words you need, and give tricky ones another try.'}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400 mb-7">
              <span className="flex items-center gap-1.5">
                <Layers3 className="w-4 h-4" /> 10 words
              </span>
              <span className="flex items-center gap-1.5">
                <CircleCheck className="w-4 h-4" /> Feedback after every answer
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => navigate(`/practice/${language}`)} className="primary-button">
                {goalReached
                  ? 'Keep practicing'
                  : encountered === 0
                    ? 'Start my first practice'
                    : 'Start daily practice'}{' '}
                <ArrowRight className="w-4 h-4" />
              </button>
              {due.length > 0 && (
                <button
                  onClick={() => navigate(`/review/${language}?focus=due`)}
                  className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-amber-200 rounded-xl hover:bg-white/5"
                >
                  <Clock3 className="w-4 h-4" /> {due.length} due for review
                </button>
              )}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="absolute -right-14 -bottom-24 w-72 h-72 rounded-full border-[35px] border-emerald-400/[0.035]"
          />
          <div
            aria-hidden="true"
            className="absolute right-12 top-16 w-20 h-20 rounded-3xl border border-emerald-300/10 rotate-12 hidden xl:flex items-center justify-center"
          >
            <BookOpen className="w-8 h-8 text-emerald-300/20" />
          </div>
        </section>

        <section aria-labelledby="goal-heading" className="surface-card rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h2 id="goal-heading" className="font-semibold">
              Your daily goal
            </h2>
            <Target className="w-4 h-4 text-slate-400" />
          </div>
          <div
            role="progressbar"
            aria-label="Words practiced today"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={Math.min(today, goal)}
            aria-valuetext={`${today} of ${goal} words practiced today`}
            className="goal-ring mx-auto mb-5"
            style={{
              background: `conic-gradient(#6ee7b7 ${Math.min(today / goal, 1) * 360}deg, #1e293b 0deg)`,
            }}
          >
            <div className="rounded-full w-full h-full flex flex-col items-center justify-center bg-[#0d1626]">
              <span className="text-4xl font-display font-bold tabular-nums">
                {today}
                <span className="text-lg text-slate-500 font-normal">/{goal}</span>
              </span>
              <span className="text-xs text-slate-400 mt-1">words practiced</span>
            </div>
          </div>
          <p className={`text-center text-sm mb-5 ${goalReached ? 'text-emerald-300' : 'text-slate-400'}`}>
            {goalReached
              ? 'Goal reached. Nice work today.'
              : today > 0
                ? `${goal - today} more ${goal - today === 1 ? 'word' : 'words'} to reach today’s goal.`
                : 'A few words today go a long way.'}
          </p>
          <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <label htmlFor="study-goal" className="text-xs text-slate-400">
              Daily target
            </label>
            <select
              id="study-goal"
              value={goal}
              onChange={(event) => setGoal(Number(event.target.value))}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
            >
              <option value={5}>5 words · Light</option>
              <option value={10}>10 words · Steady</option>
              <option value={20}>20 words · Focused</option>
            </select>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-10" aria-label="Learning progress">
        {[
          { value: encountered, label: 'Words encountered', icon: Layers3 },
          { value: mastered, label: 'Strong recall', icon: Check },
          { value: lessonCount, label: 'Lessons completed', icon: BookOpen },
        ].map(({ value, label, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-4 rounded-2xl border border-slate-800/80 bg-slate-900/30"
          >
            <div className="hidden sm:flex w-9 h-9 rounded-xl bg-slate-800/70 items-center justify-center">
              <Icon className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold tabular-nums">{value}</p>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <section aria-labelledby="skills-heading" className="mb-10">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="eyebrow mb-2">Build your skills</p>
            <h2 id="skills-heading" className="text-xl sm:text-2xl font-display font-bold">
              One language. Every way to use it.
            </h2>
          </div>
          <span className="text-xs text-slate-500 hidden sm:block">All three skills open from day one</span>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {TRACKS.map((track) => {
            const next = getNextLesson(progress, language, track.type);
            const completed = getLessonCount(progress, language, track.type);
            return (
              <div key={track.type} className="surface-card rounded-2xl p-5 flex flex-col">
                <div
                  className={`w-10 h-10 rounded-xl ${track.tint} ${track.color} flex items-center justify-center mb-5`}
                >
                  <track.icon className="w-5 h-5" />
                </div>
                <p className={`text-xs font-medium ${track.color} mb-1`}>{track.label}</p>
                <h3 className="text-lg font-display font-semibold mb-2">{track.verb}</h3>
                <p className="text-sm text-slate-400 mb-5">{track.description}</p>
                <div className="mt-auto">
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full ${track.type === 'reading' ? 'bg-emerald-400' : track.type === 'writing' ? 'bg-violet-400' : 'bg-amber-400'}`}
                      style={{ width: `${(completed / (TOTAL_LEVELS * LESSONS_PER_LEVEL)) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{completed} of 80 lessons completed</p>
                  <button
                    onClick={() =>
                      navigate(`/lesson/${language}/${track.type}/${next?.level ?? 1}/${next?.lesson ?? 1}`)
                    }
                    className="w-full flex items-center justify-between rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium hover:border-slate-500 hover:bg-slate-800/50"
                  >
                    <span>
                      {!next
                        ? 'Revisit this skill'
                        : completed
                          ? 'Continue lesson'
                          : `Start ${track.label.toLowerCase()}`}
                    </span>
                    <ArrowRight className={`w-4 h-4 ${track.color}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
        <CoursePath key={language} language={language} />
        <div className="space-y-5">
          <section className="surface-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-300" />
              <h2 className="font-semibold">A little extra attention</h2>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              {weak.length
                ? 'These words could use another look.'
                : encountered
                  ? 'Keep practicing to strengthen your recall.'
                  : 'Your tricky words will appear here as you learn.'}
            </p>
            {weak.length > 0 && (
              <ul className="space-y-2 mb-4">
                {weak.map((word) => (
                  <li
                    key={word.rank}
                    className="flex items-center justify-between gap-3 py-2 border-b border-slate-800 last:border-0"
                  >
                    <span className="font-medium text-sm">{word.word}</span>
                    <span className="text-xs text-slate-400 truncate">{word.translation}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() =>
                navigate(weak.length ? `/review/${language}?focus=weak` : `/practice/${language}`)
              }
              className="text-sm text-amber-300 hover:text-amber-200 inline-flex items-center gap-2"
            >
              {weak.length ? 'Practice these words' : 'Build your vocabulary'}{' '}
              <ArrowRight className="w-4 h-4" />
            </button>
          </section>
          <section className="rounded-2xl border border-sky-300/10 bg-sky-300/[0.035] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Headphones className="w-4 h-4 text-sky-300" />
              <h2 className="font-semibold">Your word collection</h2>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Find a word, hear its pronunciation, and see how well you know it.
            </p>
            <button
              onClick={() => navigate(`/vocabulary/${language}`)}
              className="text-sm text-sky-300 hover:text-sky-200 inline-flex items-center gap-2"
            >
              Explore vocabulary <ArrowRight className="w-4 h-4" />
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

function CoursePath({ language }: { language: Language }) {
  const navigate = useNavigate();
  const progress = useAppStore((s) => s.progress);
  const [type, setType] = useState<LessonType>('reading');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const next = getNextLesson(progress, language, type);
  const level = selectedLevel ?? next?.level ?? TOTAL_LEVELS;
  const currentTrack = TRACKS.find((track) => track.type === type)!;
  const completed = getCompletedLessonsInLevel(progress, language, type, level);
  return (
    <section className="surface-card rounded-2xl p-5 sm:p-6" aria-labelledby="path-heading">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 id="path-heading" className="font-display text-xl font-semibold">
          Your learning path
        </h2>
        <span className="text-xs text-slate-500">16 levels per skill</span>
      </div>
      <div className="flex gap-1.5 rounded-xl bg-slate-950/60 p-1 mb-6" aria-label="Choose a skill">
        {TRACKS.map((track) => (
          <button
            key={track.type}
            aria-pressed={type === track.type}
            onClick={() => {
              setType(track.type);
              setSelectedLevel(null);
            }}
            className={`flex-1 py-2.5 px-2 text-xs sm:text-sm rounded-lg transition-colors ${type === track.type ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            {track.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className={`text-xs ${currentTrack.color} font-medium mb-1`}>
            {currentTrack.label} · Level {level}
          </p>
          <h3 className="font-semibold">
            Words {(level - 1) * 50 + 1}–{level * 50}
          </h3>
        </div>
        <span className="text-xs text-slate-400">{completed}/5 complete</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
        {Array.from({ length: 5 }, (_, i) => i + 1).map((lesson) => {
          const entry = progress[language]?.[type]?.[`${level}-${lesson}`];
          const unlocked = isLessonUnlocked(progress, language, type, level, lesson);
          const isNext = next?.level === level && next?.lesson === lesson;
          return (
            <button
              key={lesson}
              disabled={!unlocked}
              onClick={() => navigate(`/lesson/${language}/${type}/${level}/${lesson}`)}
              aria-label={`${currentTrack.label} level ${level}, lesson ${lesson}${entry?.completed ? ', completed' : !unlocked ? ', locked' : ', available'}`}
              title={!unlocked ? 'Complete the previous lesson in this skill to unlock' : undefined}
              className={`text-left p-3 rounded-xl border transition-colors ${entry?.completed ? 'border-emerald-400/20 bg-emerald-400/5' : isNext ? `${currentTrack.border} ${currentTrack.tint}` : 'border-slate-800 bg-slate-900/50'} ${!unlocked ? 'text-slate-500 cursor-not-allowed' : 'hover:border-slate-500'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px]">LESSON</span>
                {entry?.completed ? (
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                ) : !unlocked ? (
                  <LockKeyhole className="w-3 h-3" />
                ) : (
                  <ArrowRight className={`w-3.5 h-3.5 ${currentTrack.color}`} />
                )}
              </div>
              <span className="block text-xl font-display font-bold mb-1">
                {String(lesson).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-400">
                {entry?.completed && entry.score !== undefined ? `${entry.score}% score` : '10 words'}
              </span>
            </button>
          );
        })}
      </div>
      <details className="border-t border-slate-800 pt-4">
        <summary className="text-sm text-slate-400 hover:text-white cursor-pointer list-none flex items-center justify-between">
          Explore all levels <ChevronDown className="w-4 h-4" />
        </summary>
        <div className="grid grid-cols-8 gap-2 mt-4">
          {Array.from({ length: 16 }, (_, i) => i + 1).map((item) => (
            <button
              key={item}
              aria-label={`Show level ${item}`}
              aria-pressed={level === item}
              onClick={() => setSelectedLevel(item)}
              className={`py-2 rounded-lg text-xs border ${level === item ? `${currentTrack.border} ${currentTrack.tint} text-white` : 'border-slate-800 text-slate-400 hover:text-white'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Move through each skill at your own pace. Completing a lesson unlocks the next one in that skill.
        </p>
      </details>
    </section>
  );
}
