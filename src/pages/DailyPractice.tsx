import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Lightbulb, Loader2, RotateCcw, Sparkles, Target } from 'lucide-react';
import { fetchWords } from '../api/client';
import { AudioPlayer } from '../components/AudioPlayer';
import { useAppStore } from '../store/appStore';
import { LANGUAGES, type Language, type Word } from '../types/language';
import { appendRetry, buildPracticeQuestions, checkAnswer, selectPracticeWords, type PracticeQuestion } from '../lib/practice';
import { getReviewableRanks } from '../lib/review';

const ACCENTS: Record<Language, string[]> = {
  spanish: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'],
  french: ['à', 'â', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'ù', 'û', 'ü', 'œ'],
  dutch: ['é', 'ë', 'ï', 'ö', 'ü'],
};
const LANG_CODES: Record<Language, string> = { spanish: 'es', french: 'fr', dutch: 'nl' };
const PRIMARY = 'min-h-12 px-6 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

export function DailyPractice() {
  const { language } = useParams<{ language: string }>();
  const lang = LANGUAGES.find((item) => item.id === language);
  if (!lang) return <main id="main-content" className="max-w-3xl mx-auto px-6 py-12"><h1 className="text-2xl font-bold">Choose a language to practice</h1><Link className="inline-block mt-6 text-emerald-300" to="/">Back to dashboard</Link></main>;
  return <PracticeLobby key={lang.id} language={lang.id} label={lang.label} />;
}

function PracticeLobby({ language, label }: { language: Language; label: string }) {
  const progress = useAppStore((state) => state.progress);
  const performance = useAppStore((state) => state.wordPerformance);
  const [corpus, setCorpus] = useState<Word[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState<PracticeQuestion[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchWords(language).then((words) => {
      if (!Array.isArray(words)) throw new Error('Invalid words');
      if (!cancelled) setCorpus(words);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [language, attempt]);
  const deck = useMemo(() => selectPracticeWords(corpus ?? [], progress, performance, language), [corpus, progress, performance, language]);
  const encountered = getReviewableRanks(progress, performance, language);
  const newCount = deck.filter((word) => !encountered.has(word.rank)).length;
  return <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 min-h-10"><ArrowLeft size={16} /> Back to dashboard</Link>
    <div className="flex items-center gap-2 text-emerald-300 text-xs uppercase font-semibold tracking-[.18em] mb-3"><Sparkles size={15} aria-hidden="true" /> Daily practice · {label}</div>
    <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-3">Make your words stick.</h1>
    <p className="text-slate-400 mb-8">Recall a little. Learn from mistakes. Come back stronger.</p>
    {session ? <PracticeSession initial={session} language={language} label={label} onRestart={() => setSession(null)} /> : <section className="glass rounded-3xl p-6 sm:p-9">
      {error ? <div role="alert"><h2 className="font-semibold text-lg mb-2">Your words couldn’t load</h2><p className="text-slate-400 mb-6">Check your connection and try again. Your progress is still here.</p><button className={PRIMARY} onClick={() => { setError(false); setAttempt((value) => value + 1); }}>Try again</button></div>
        : !corpus ? <p role="status" className="flex items-center gap-3 text-slate-300"><Loader2 className="animate-spin" /> Preparing your words…</p>
        : !deck.length ? <p role="status" className="text-slate-300">No practice words are available for this language yet.</p>
        : <>
          <div className="w-14 h-14 bg-emerald-400/10 text-emerald-300 rounded-2xl flex items-center justify-center mb-6"><Target size={28} /></div>
          <h2 className="text-2xl font-display font-bold mb-3">A small session. Real recall.</h2>
          <p className="text-slate-400 leading-relaxed">{deck.length} words, a mix of meaning and spelling. Due and tricky words come first. Anything you miss gets one more try at the end.</p>
          {newCount > 0 && <p className="text-emerald-300 text-sm mt-3">Includes {newCount} new {newCount === 1 ? 'word' : 'words'}. Preview them below before you start.</p>}
          <div className="grid grid-cols-2 gap-3 mt-6 mb-7 text-sm"><div className="bg-slate-800/60 rounded-2xl p-4"><p className="text-white font-semibold mb-1">Recognize the meaning</p><p className="text-slate-400">Choose the right translation.</p></div><div className="bg-slate-800/60 rounded-2xl p-4"><p className="text-white font-semibold mb-1">Recall the word</p><p className="text-slate-400">Type it from memory.</p></div></div>
          <button className={`${PRIMARY} w-full flex justify-center items-center gap-2`} onClick={() => setSession(buildPracticeQuestions(deck, corpus))}>Start practice <ArrowRight size={18} /></button>
          <details className="mt-6 border-t border-slate-700/50 pt-5"><summary className="cursor-pointer text-sm text-slate-300 min-h-10">New to these words? Preview before you start</summary><dl className="mt-3 grid sm:grid-cols-2 gap-2">{deck.map((word) => <div key={word.rank} className="bg-slate-800/40 p-3 rounded-xl"><dt lang={LANG_CODES[language]} className="font-medium text-emerald-200">{word.word}</dt><dd className="text-sm text-slate-400 mt-1">{word.translation}</dd></div>)}</dl></details>
        </>}
    </section>}
  </main>;
}

type Result = { question: PracticeQuestion; correct: boolean; assisted: boolean; accent: boolean };

function PracticeSession({ initial, language, label, onRestart }: { initial: PracticeQuestion[]; language: Language; label: string; onRestart: () => void }) {
  const recordWord = useAppStore((state) => state.recordWord);
  const [queue, setQueue] = useState(initial);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [assisted, setAssisted] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const complete = index >= queue.length;
  const question = queue[index];
  const result = results[index];
  const firstResults = results.filter((item) => !item.question.retry);
  const recalled = firstResults.filter((item) => item.correct && !item.assisted).length;
  const missed = firstResults.filter((item) => !item.correct || item.assisted);

  useEffect(() => {
    if (result) next.current?.focus();
    else if (!complete && question.mode === 'typing') input.current?.focus();
    else heading.current?.focus();
  }, [index, result, complete, question]);

  function submit(skipped = false) {
    if (!question || result || lock.current || (!skipped && !answer.trim())) return;
    lock.current = true;
    const verdict = checkAnswer(skipped ? '' : answer, question.mode === 'meaning' ? question.word.translation : question.word.word);
    const correct = verdict === 'correct';
    if (!question.retry) {
      recordWord(language, question.word.rank, question.word.word, question.word.translation, correct && !assisted);
      if (!correct || assisted) setQueue((value) => appendRetry(value, index));
    }
    setResults((value) => [...value, { question, correct, assisted, accent: verdict === 'accent' }]);
  }

  function advance() {
    if (!result) return;
    setAnswer('');
    setAssisted(false);
    setIndex((value) => value + 1);
    lock.current = false;
  }

  function insertAccent(character: string) {
    const field = input.current;
    const start = field?.selectionStart ?? answer.length;
    const end = field?.selectionEnd ?? start;
    setAnswer(answer.slice(0, start) + character + answer.slice(end));
    field?.focus();
    requestAnimationFrame(() => field?.setSelectionRange(start + character.length, start + character.length));
  }

  if (complete) return <section className="glass rounded-3xl p-6 sm:p-9">
    <div className="w-16 h-16 rounded-full bg-emerald-400/10 flex items-center justify-center text-emerald-300 mb-6"><Check size={32} /></div>
    <h2 ref={heading} tabIndex={-1} className="font-display text-3xl font-bold mb-3">Practice complete.</h2>
    <p className="text-slate-400 mb-7">Every honest attempt helps plan your next review. Keep building from here.</p>
    <dl className="grid grid-cols-3 gap-2 mb-7">{[{ label: 'First-try recall', value: `${Math.round(recalled / initial.length * 100)}%` }, { label: 'Words practiced', value: initial.length }, { label: 'Needed practice', value: missed.length }].map((stat) => <div key={stat.label} className="bg-slate-800/60 rounded-2xl p-3 sm:p-4"><dt className="text-xs text-slate-400">{stat.label}</dt><dd className="text-2xl sm:text-3xl font-bold mt-2 text-white">{stat.value}</dd></div>)}</dl>
    <p className="text-xs text-slate-500 mb-6">First-try recall excludes hints. Retry answers don’t inflate your score.</p>
    {missed.length > 0 && <div className="mb-7"><h3 className="font-semibold mb-3">Give these another look</h3><ul className="space-y-2">{missed.map((item) => { const recovered = results.some((retry) => retry.question.retry && retry.question.word.rank === item.question.word.rank && retry.correct && !retry.assisted); return <li key={item.question.word.rank} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-800/40 px-4 py-3"><div><span lang={LANG_CODES[language]} className="font-medium">{item.question.word.word}</span><span className="text-sm text-slate-400 ml-3">{item.question.word.translation}</span></div><span className={`text-xs ${recovered ? 'text-emerald-300' : 'text-amber-300'}`}>{recovered ? 'Recalled on retry' : 'Keep practicing'}</span></li>; })}</ul></div>}
    <div className="flex flex-col sm:flex-row gap-3"><Link className={`${PRIMARY} text-center`} to="/">Back to dashboard</Link><button className="min-h-12 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 font-medium" onClick={onRestart}>Practice again</button></div>
  </section>;

  return <section aria-label="Daily practice session">
    <div className="flex justify-between gap-3 items-center text-sm mb-3"><span className="text-slate-300">{question.retry ? 'Second chance' : `Word ${index + 1} of ${initial.length}`}</span><span className="text-slate-500">{question.retry ? `${queue.length - index} to go` : `${initial.length - firstResults.length} first attempts left`}</span></div>
    <div role="progressbar" aria-label="First attempts completed" aria-valuenow={firstResults.length} aria-valuemin={0} aria-valuemax={initial.length} className="h-2 rounded-full bg-slate-800 overflow-hidden mb-6"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all" style={{ width: `${firstResults.length / initial.length * 100}%` }} /></div>
    <form onKeyDown={(event) => { if (event.key === 'Enter' && (event.repeat || event.nativeEvent.isComposing)) event.preventDefault(); }} onSubmit={(event) => { event.preventDefault(); if (result) advance(); else submit(); }} className="glass rounded-3xl p-6 sm:p-9">
      <div className="text-xs font-semibold tracking-widest uppercase text-cyan-300 mb-5 flex items-center gap-2">{question.retry && <RotateCcw size={14} />}{question.mode === 'meaning' ? 'Find the meaning' : `Write in ${label}`}</div>
      <p className="text-sm text-slate-400 mb-3">{question.mode === 'meaning' ? 'What does this word mean?' : 'Which word matches this meaning?'}</p>
      <h2 ref={heading} tabIndex={-1} lang={question.mode === 'meaning' ? LANG_CODES[language] : 'en'} className="font-display text-3xl sm:text-4xl font-bold leading-tight break-words mb-7">{question.mode === 'meaning' ? question.word.word : question.word.translation}</h2>
      {question.mode === 'meaning' ? <fieldset disabled={Boolean(result)} className="grid gap-3"><legend className="sr-only">Choose the English meaning</legend>{question.options.map((option, optionIndex) => <label key={option} className={`flex items-center gap-3 p-4 rounded-2xl border min-h-14 cursor-pointer transition-colors ${answer === option ? 'bg-emerald-400/10 border-emerald-400/60 text-white' : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-500 text-slate-300'} ${result && option === question.word.translation ? 'border-emerald-400 bg-emerald-400/10' : ''}`}><input type="radio" name="meaning" value={option} checked={answer === option} onChange={() => setAnswer(option)} className="accent-emerald-400 w-4 h-4 shrink-0" /><span className="text-xs text-slate-500" aria-hidden="true">{optionIndex + 1}</span><span>{option}</span>{result && option === question.word.translation && <Check className="ml-auto text-emerald-300 shrink-0" size={18} />}</label>)}</fieldset>
        : <div><label htmlFor="practice-answer" className="sr-only">Your answer in {label}</label><input ref={input} id="practice-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={Boolean(result)} autoComplete="off" autoCapitalize="none" spellCheck={false} lang={LANG_CODES[language]} placeholder={`Type the ${label} word`} aria-describedby="spelling-note" className="w-full bg-slate-900/70 border border-slate-600 rounded-2xl px-4 py-4 text-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-70" /><div role="group" aria-label="Accented letters" className="flex flex-wrap gap-2 mt-3">{ACCENTS[language].map((character) => <button type="button" key={character} disabled={Boolean(result)} onClick={() => insertAccent(character)} aria-label={`Insert ${character}`} className="min-w-11 min-h-11 px-3 bg-slate-800 rounded-xl hover:bg-slate-700 disabled:opacity-40">{character}</button>)}</div><p id="spelling-note" className="text-xs text-slate-500 mt-3">Accents count. Capitalization and surrounding punctuation don’t.</p></div>}
      {!result && <><div className="mt-5 mb-6"><button type="button" onClick={() => setAssisted(true)} disabled={assisted} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-amber-200 min-h-11 disabled:text-amber-300"><Lightbulb size={16} />{assisted ? 'Hint used · this word will return' : 'Need a hint?'}</button>{assisted && <p className="text-sm text-amber-200 mt-1">{question.mode === 'typing' ? `Starts with “${Array.from(question.word.word)[0]}” · ${Array.from(question.word.word).length} characters` : `The answer starts with “${Array.from(question.word.translation)[0]}”.`}</p>}</div><button type="submit" disabled={!answer.trim()} className={`${PRIMARY} w-full`}>Check answer</button><button type="button" onClick={() => submit(true)} className="w-full min-h-12 text-sm text-slate-400 hover:text-white mt-2">I don’t know yet</button></>}
      {result && <div className="mt-6"><div role="status" className={`rounded-2xl p-5 border mb-5 ${result.correct && !result.assisted ? 'border-emerald-400/20 bg-emerald-400/10' : 'border-amber-400/20 bg-amber-400/10'}`}><h3 className={`font-semibold text-lg mb-2 ${result.correct && !result.assisted ? 'text-emerald-300' : 'text-amber-200'}`}>{result.accent ? 'Almost — check the accent.' : result.correct ? result.assisted ? 'Correct with a little help.' : 'You’ve got it.' : 'A word worth another look.'}</h3><p className="text-white"><span lang={LANG_CODES[language]} className="font-semibold">{question.word.word}</span><span className="text-slate-300"> — {question.word.translation}</span></p>{question.word.notes && <p className="text-sm text-slate-400 mt-2">{question.word.notes}</p>}<p className="text-xs text-slate-400 mt-3 mb-4">{!question.retry && (!result.correct || result.assisted) ? 'You’ll try this again after the other words.' : question.retry ? 'This retry helps you learn; your first attempt determines the review schedule.' : 'First attempt recorded for your next review.'}</p><AudioPlayer text={question.word.word} language={language} /></div><button ref={next} type="submit" className={`${PRIMARY} w-full flex justify-center gap-2 items-center`}>{index + 1 === queue.length ? 'See my results' : 'Continue'}<ArrowRight size={18} /></button></div>}
    </form>
  </section>;
}
