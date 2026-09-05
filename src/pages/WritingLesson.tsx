import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, RotateCcw, PencilLine } from 'lucide-react';
import { useLesson } from '../hooks/useLesson';
import { useAppStore } from '../store/appStore';
import { LESSONS_PER_LEVEL, TOTAL_LEVELS } from '../lib/persistence';
import { gradeWritingAnswer, getExerciseWord } from '../lib/answerGrading';
import type { Language } from '../types/language';

export function WritingLesson() {
  const { language, level, lesson: lessonParam } = useParams();
  const navigate = useNavigate();
  const completeLesson = useAppStore((s) => s.completeLesson);
  const recordWord = useAppStore((s) => s.recordWord);
  const { lesson, isLoading, error, loadLesson } = useLesson();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [retained, setRetained] = useState<number[]>([]);
  const [attempt, setAttempt] = useState(1);
  const lang = language as Language;
  const lvl = Number(level), lessonNum = Number(lessonParam);
  useEffect(() => { void loadLesson(lang, 'writing', lvl, lessonNum); }, [lang, lvl, lessonNum, loadLesson]);

  if (isLoading) return <main id="main-content" tabIndex={-1} className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-4"/><h2 className="text-white font-medium">Preparing your writing practice</h2><p className="text-sm text-slate-400 mt-2">Useful sentences, with feedback that helps you improve.</p></div></main>;
  if (error) return <main id="main-content" tabIndex={-1} className="max-w-3xl mx-auto px-6 py-12 text-center"><p role="alert" className="text-red-300 mb-4">{error}</p><button onClick={() => loadLesson(lang, 'writing', lvl, lessonNum)} className="px-5 py-3 bg-slate-700 text-white rounded-xl">Try again</button></main>;
  if (!lesson || lesson.type !== 'writing') return null;
  const data = lesson;
  const exercises = data.exercises;
  const results = exercises.map((exercise, i) => gradeWritingAnswer(exercise, answers[i] ?? ''));
  const correctCount = results.filter((result) => result.correct).length;
  const score = exercises.length ? Math.round(correctCount / exercises.length * 100) : 0;
  const passed = score >= 60;
  const allAnswered = exercises.length > 0 && exercises.every((_, i) => answers[i]?.trim());

  function submit() {
    if (!allAnswered || submitted) return;
    setSubmitted(true);
    if (passed) completeLesson(lang, 'writing', lvl, lessonNum, score);
    if (attempt === 1) exercises.forEach((exercise, i) => {
      const word = getExerciseWord(exercise, data.corpusWords ?? []);
      if (word) recordWord(lang, word.rank, word.word, word.translation, results[i].correct);
    });
  }
  function retryMissed() {
    const correct = results.flatMap((result, i) => result.correct ? [i] : []);
    setRetained(correct);
    setAnswers(Object.fromEntries(correct.map((i) => [i, answers[i]])));
    setAttempt((value) => value + 1);
    setSubmitted(false);
  }
  function next() {
    if (lessonNum < LESSONS_PER_LEVEL) navigate(`/lesson/${lang}/writing/${lvl}/${lessonNum + 1}`);
    else if (lvl < TOTAL_LEVELS) navigate(`/lesson/${lang}/writing/${lvl + 1}/1`);
    else navigate('/');
  }
  return <main id="main-content" tabIndex={-1} className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
    <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 text-sm"><ArrowLeft className="w-4 h-4"/> Back to dashboard</button>
    <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">Writing · Level {lvl} · Lesson {lessonNum}</p>
    <h1 className="text-3xl font-display font-bold text-white">{data.title}</h1>
    <p className="text-slate-400 mt-3 mb-6">{data.objective || 'Build useful sentences and learn from each correction.'}</p>
    <div className="glass rounded-xl p-4 mb-6 flex items-start gap-3"><PencilLine className="w-5 h-5 text-violet-400 shrink-0"/><p className="text-sm text-slate-300">Try each answer from memory. Accents matter; common accepted translations are checked too. {attempt > 1 && 'Your correct answers are saved. Focus on the ones you missed.'}</p></div>
    <div className="space-y-4 mb-6">{exercises.map((exercise, i) => {
      const checked = submitted || retained.includes(i);
      const result = results[i];
      return <section key={i} className="glass rounded-2xl p-5 sm:p-6" aria-label={`Exercise ${i + 1}`}>
        <label htmlFor={`answer-${i}`} className="block text-sm text-slate-300 mb-3"><span className="text-violet-400 font-semibold mr-2">{i + 1}.</span>{exercise.instruction}</label>
        {exercise.sentence && <p className="text-white font-medium mb-3">{exercise.sentence}</p>}
        {exercise.word && <p className="text-xl text-white font-semibold mb-3">{exercise.word}</p>}
        {exercise.words && <div className="flex flex-wrap gap-2 mb-3">{exercise.words.map((word, j) => <span key={j} className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-sm">{word}</span>)}</div>}
        {exercise.hint && !checked && <details className="text-sm text-slate-400 mb-3"><summary className="cursor-pointer">Need a hint?</summary><p className="mt-2">{exercise.hint}</p></details>}
        {exercise.type === 'multiple-choice' ? <div className="grid gap-2 sm:grid-cols-2">{exercise.options?.map((option, j) => <button key={j} disabled={checked} aria-pressed={answers[i] === String(j)} onClick={() => setAnswers((previous) => ({...previous, [i]: String(j)}))} className={`text-left px-4 py-3 rounded-xl border ${checked && j === exercise.correctIndex ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40' : answers[i] === String(j) ? 'border-violet-400 text-white bg-violet-500/15' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}>{option}</button>)}</div> : <input id={`answer-${i}`} autoComplete="off" spellCheck={false} value={answers[i] ?? ''} disabled={checked} onChange={(event) => setAnswers((previous) => ({...previous, [i]: event.target.value}))} placeholder="Type your answer…" className={`w-full bg-slate-900 rounded-xl border px-4 py-3 text-white ${checked ? result.correct ? 'border-emerald-500' : 'border-amber-500' : 'border-slate-600 focus:border-violet-400'}`}/>}
        {checked && <div className={`mt-4 text-sm ${result.correct ? 'text-emerald-300' : 'text-amber-300'}`}><p className="font-medium">{result.correct ? 'Correct!' : result.feedback}</p>{exercise.explanation && <p className="mt-2 text-slate-300">{exercise.explanation}</p>}</div>}
      </section>;
    })}</div>
    {!submitted ? <button onClick={submit} disabled={!allAnswered} className="w-full rounded-2xl px-5 py-4 bg-violet-500 text-white font-semibold disabled:bg-slate-700 disabled:text-slate-400">{allAnswered ? 'Check answers' : `Answer all exercises (${exercises.filter((_, i) => answers[i]?.trim()).length}/${exercises.length})`}</button> : <section aria-live="polite" className="glass rounded-2xl p-7 text-center">
      <CheckCircle2 className="w-10 h-10 text-violet-400 mx-auto mb-3"/><h2 className="text-2xl text-white font-bold">{correctCount}/{exercises.length} correct</h2>
      <p className="text-slate-400 mt-2 mb-5">{correctCount === exercises.length ? 'Every answer is correct. Keep building your confidence.' : 'Read the feedback, then practise the answers you missed.'}</p>
      <div className="flex flex-wrap justify-center gap-3">{correctCount < exercises.length && <button onClick={retryMissed} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-700 text-white"><RotateCcw className="w-4 h-4"/> Practise missed answers</button>}<button onClick={passed ? next : () => navigate('/')} className="px-5 py-3 rounded-xl bg-violet-500 text-white">{passed ? 'Next lesson' : 'Back to dashboard'}</button></div>
    </section>}
  </main>;
}
