import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Lightbulb, RotateCcw } from 'lucide-react';
import { getMissions } from '../data/missions';
import { useAppStore } from '../store/appStore';
import { getConceptWeaknesses, getUnresolvedLearningMistakes } from '../lib/learningJournal';
import { normalizeWritingAnswer } from '../lib/answerGrading';
import { AudioPlayer } from '../components/AudioPlayer';
import { LANGUAGES, type Language } from '../types/language';
import type { LearningAbility } from '../types/mission';

function Clinic({ language }: { language: Language }) {
  const journal = useAppStore((state) => state.learningJournal);
  const record = useAppStore((state) => state.recordLearningAttempt);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [deck] = useState(() => {
    const weak = getConceptWeaknesses(journal, language);
    const unresolved = getUnresolvedLearningMistakes(journal, language);
    const ranks = new Map(weak.map((item, index) => [item.concept, index]));
    const pool = getMissions(language).flatMap((mission) => mission.phrases.map((phrase) => ({ mission, phrase })));
    return pool
      .filter(({ mission, phrase }) => weak.some((item) => item.missionIds.includes(mission.id) && item.phraseIds.includes(`${mission.id}:${phrase.id}`)))
      .sort((a, b) => (ranks.get(a.phrase.concept) ?? 99) - (ranks.get(b.phrase.concept) ?? 99)).slice(0, 6)
      .map((item) => {
        const errors = unresolved.filter((attempt) => attempt.phraseId === `${item.mission.id}:${item.phrase.id}`).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        const ability: LearningAbility = errors[0]?.ability === 'listening' ? 'listening' : errors[0]?.ability === 'recognition' ? 'recognition' : 'recall';
        const options = [...new Set([item.phrase.translation, ...pool.map((entry) => entry.phrase.translation)])].slice(0, 4);
        for (let index = options.length - 1; index > 0; index--) { const other = Math.floor(Math.random() * (index + 1)); [options[index], options[other]] = [options[other], options[index]]; }
        return { ...item, ability, options };
      });
  });
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [assistedCount, setAssistedCount] = useState(0);
  const submitted = useRef(false);
  const active = deck[index];
  function check() {
    if (!active || submitted.current || !answer.trim() || (active.ability === 'listening' && !audioStarted && !showHint)) return;
    submitted.current = true;
    const correct = active.ability !== 'recall' ? answer === active.phrase.translation : [active.phrase.text, ...(active.phrase.alternatives ?? [])].some((candidate) => normalizeWritingAnswer(candidate) === normalizeWritingAnswer(answer));
    record({ id: `${sessionId}:${active.mission.id}:${active.phrase.id}`, sessionId, missionId: active.mission.id, language, phraseId: `${active.mission.id}:${active.phrase.id}`, concept: active.phrase.concept, ability: active.ability, evidence: 'objective', correct, assisted: showHint, phase: 'practice', createdAt: new Date().toISOString() });
    setResult(correct);
    if (correct && !showHint) setCorrectCount((count) => count + 1);
    if (showHint) setAssistedCount((count) => count + 1);
  }
  function next() { submitted.current = false; setIndex((value) => value + 1); setAnswer(''); setShowHint(false); setAudioStarted(false); setResult(null); }
  return <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
    <Link className="inline-flex items-center gap-2 text-sm text-slate-400 mb-8" to={`/missions/${language}`}><ArrowLeft size={16} />Back to missions</Link>
    <p className="eyebrow mb-3">PERSONAL MISTAKE PRACTICE</p><h1 className="text-3xl font-display font-bold">A little attention goes a long way.</h1>
    <p className="text-slate-400 mt-3 mb-8">Revisit the phrase patterns you missed. Try recalling them first; an explanation is always available.</p>
    {!deck.length ? <section className="surface-card rounded-2xl p-8"><Check className="text-emerald-300 mb-4" /><h2 className="text-xl font-semibold">No recent difficulties to revisit</h2><p className="text-sm text-slate-400 mt-3 mb-6">Complete a mission to find which phrases need practice. A clean list reflects recent checks, not complete mastery.</p><Link className="primary-button" to={`/missions/${language}`}>Choose a mission<ArrowRight size={16} /></Link></section>
      : !active ? <section className="study-hero rounded-2xl p-8" role="status"><h2 className="text-2xl font-semibold">You gave those phrases another chance.</h2><p className="text-slate-300 mt-4">{correctCount} of {deck.length} recalled without help · {assistedCount} with support.</p><p className="text-sm text-slate-400 mt-3 mb-6">Check them again in a future session to see what stayed with you.</p><Link className="primary-button" to={`/missions/${language}`}>Back to missions<ArrowRight size={16} /></Link></section>
        : <section key={index} className="surface-card rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 mb-6"><p className="eyebrow">PHRASE {index + 1} OF {deck.length}</p><span className="text-xs text-slate-400">{active.mission.title}</span></div>
          <p className="text-sm text-emerald-300 mb-3">{active.phrase.concept} · {active.ability === 'listening' ? 'Listening focus' : active.ability === 'recognition' ? 'Meaning focus' : 'Recall focus'}</p><h2 className="text-xl font-semibold">{active.ability === 'listening' ? 'Listen, then choose the meaning.' : active.ability === 'recognition' ? active.phrase.text : active.phrase.translation}</h2>
          {active.ability === 'listening' && <div className="mt-5"><AudioPlayer text={active.phrase.text} language={language} onPlaybackStart={() => setAudioStarted(true)} /><button type="button" onClick={() => setShowHint(true)} className="text-sm text-slate-400 underline underline-offset-4 mt-3">Audio unavailable? Read instead (assisted)</button></div>}
          <p className="text-sm text-slate-400 mt-2">{active.ability === 'recall' ? 'Recall the phrase from this mission. Accents matter; common authored alternatives are accepted.' : 'This checks the skill that was difficult in your earlier attempt.'}</p>
          <form onSubmit={(event) => { event.preventDefault(); check(); }} className="mt-6">{active.ability === 'recall' ? <><label className="block text-sm text-slate-300 mb-2" htmlFor="clinic-answer">Your phrase</label><input key={`answer-${index}`} autoFocus id="clinic-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={result !== null} autoComplete="off" spellCheck={false} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-base" /></> : <fieldset disabled={result !== null}><legend className="text-sm text-slate-300 mb-3">Choose the English meaning</legend><div className="grid gap-2">{active.options.map((option) => <label key={option} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer ${answer === option ? 'border-emerald-300 bg-emerald-300/5' : 'border-slate-700 bg-slate-950'}`}><input type="radio" name="clinic-choice" value={option} checked={answer === option} onChange={() => setAnswer(option)} /><span className="text-sm">{option}</span></label>)}</div></fieldset>}
            {result === null && <div className="flex flex-wrap gap-4 items-center mt-5"><button className="primary-button" disabled={!answer.trim() || (active.ability === 'listening' && !audioStarted && !showHint)}>Check phrase<Check size={16} /></button><button type="button" onClick={() => setShowHint(true)} className="inline-flex items-center gap-2 text-sm text-slate-300 underline underline-offset-4"><Lightbulb size={16} />Show explanation</button></div>}
          </form>
          {(showHint || result !== null) && <div className="mt-6 p-5 rounded-xl bg-slate-950 border border-slate-800" role="status"><p className="text-lg font-semibold text-emerald-300">{active.phrase.text}</p><p className="text-sm text-slate-300 mt-3 mb-4">{active.phrase.explanation}</p><AudioPlayer text={active.phrase.text} language={language} />{result === null && <p className="text-xs text-amber-200 mt-3">This attempt will be recorded as assisted practice.</p>}</div>}
          {result !== null && <div className="mt-6"><p className={`text-sm mb-4 ${result ? 'text-emerald-300' : 'text-amber-200'}`}>{result ? showHint ? 'Correct with support. Keep revisiting it.' : 'Recalled without help.' : 'This differs from the authored phrase. Compare the model and say it once more.'}</p>{!result && <p className="text-sm text-slate-400 flex items-start gap-2 mb-5"><RotateCcw size={16} className="shrink-0 mt-0.5" />The explanation targets this phrase pattern. Your first answer stays in your history.</p>}<button type="button" className="primary-button" onClick={next}>{index === deck.length - 1 ? 'Finish practice' : 'Next phrase'}<ArrowRight size={16} /></button></div>}
        </section>}
  </main>;
}

export function MistakePractice() {
  const { language } = useParams();
  const supported = LANGUAGES.find((item) => item.id === language);
  if (!supported) return <main id="main-content" className="p-8"><Link to="/">Choose a language from your dashboard</Link></main>;
  return <Clinic key={supported.id} language={supported.id} />;
}
