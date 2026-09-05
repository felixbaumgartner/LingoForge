import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Headphones, MessageCircle, CalendarClock, Check, Sparkles, Target } from 'lucide-react';
import { getMissions } from '../data/missions';
import { useAppStore } from '../store/appStore';
import { getAbilityStats, getConceptWeaknesses, getMissionDue } from '../lib/learningJournal';
import { LANGUAGES, type Language } from '../types/language';
import type { LearningAbility, Mission } from '../types/mission';

const GOALS = [
  { id: 'all', label: 'Explore everything' },
  { id: 'everyday', label: 'Everyday errands' },
  { id: 'social', label: 'Meet people' },
  { id: 'appointments', label: 'Make plans' },
] as const;
const ABILITIES: { id: LearningAbility; label: string; description: string }[] = [
  { id: 'recognition', label: 'Recognize', description: 'Find the meaning in writing' },
  { id: 'listening', label: 'Understand', description: 'Follow a spoken situation' },
  { id: 'recall', label: 'Remember', description: 'Produce a phrase without options' },
  { id: 'use', label: 'Communicate', description: 'Use phrases in a practical task' },
];

function MissionCollection({ language }: { language: Language }) {
  const navigate = useNavigate();
  const uid = useAppStore((state) => state.uid);
  const journal = useAppStore((state) => state.learningJournal);
  const storageKey = `lingoforge_mission_goal:${encodeURIComponent(uid ?? 'guest')}:${language}`;
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  let saved = 'all';
  try { saved = localStorage.getItem(storageKey) ?? 'all'; } catch { /* In-memory selection still works. */ }
  const goal = preferences[storageKey] ?? (GOALS.some((item) => item.id === saved) ? saved : 'all');
  function chooseGoal(value: string) {
    setPreferences((current) => ({ ...current, [storageKey]: value }));
    try { localStorage.setItem(storageKey, value); } catch { /* Preference lasts for this visit. */ }
  }
  const missions = getMissions(language);
  const languageName = LANGUAGES.find((item) => item.id === language)?.label;
  const stats = getAbilityStats(journal, language);
  const weaknesses = getConceptWeaknesses(journal, language);
  const due = missions.filter((mission) => getMissionDue(journal, mission.id).due);
  const completed = new Set(Object.values(journal.completions).filter((entry) => entry.language === language && entry.phase === 'practice').map((entry) => entry.missionId));
  const visible = missions.filter((mission) => goal === 'all' || mission.goal === goal);
  const recommended = visible.find((mission) => !completed.has(mission.id)) ?? visible.find((mission) => weaknesses.some((item) => item.missionIds.includes(mission.id))) ?? visible[0];
  const transferAttempts = Object.values(journal.attempts).filter((attempt) => attempt.language === language && attempt.phase === 'transfer' && attempt.evidence === 'objective' && !attempt.assisted);
  const successfulTransfer = transferAttempts.filter((attempt) => attempt.correct).length;

  function missionCard(mission: Mission) {
    const schedule = getMissionDue(journal, mission.id);
    const active = recommended?.id === mission.id;
    return <article key={mission.id} className={`surface-card rounded-2xl p-6 flex flex-col ${active ? 'ring-1 ring-emerald-300/50' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <span className="eyebrow">{mission.minutes} min · {mission.phrases.length} useful phrases</span>
        {completed.has(mission.id) && <span className="text-xs text-emerald-300 flex items-center gap-1"><Check size={14} />Practiced</span>}
      </div>
      <h2 className="text-xl font-display font-semibold">{mission.title}</h2>
      <p className="text-slate-400 text-sm leading-relaxed mt-3">{mission.description}</p>
      <p className="text-sm text-slate-200 mt-5 mb-6 flex-1">{mission.objective}</p>
      {active && <p className="text-xs text-emerald-300 mb-3">{completed.has(mission.id) ? 'A useful situation to revisit' : 'Suggested for your goal'}</p>}
      <Link className="primary-button" to={`/missions/${language}/${mission.id}`}>{completed.has(mission.id) ? 'Practice again' : 'Start mission'}<ArrowRight size={16} /></Link>
      {schedule.dueAt && <p className="text-xs text-slate-400 mt-4">{schedule.due ? 'Your delayed check is ready.' : `${schedule.stage === 'month' ? 'Repeat retention check' : 'Different-situation check'} from ${new Date(schedule.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.`}</p>}
      {completed.has(mission.id) && <Link className="text-sm text-emerald-300 mt-3 underline underline-offset-4" to={`/missions/${language}/${mission.id}?mode=transfer`}>{schedule.due ? schedule.stage === 'month' ? 'Repeat retention check' : 'Take delayed check' : 'Rehearse this mission'}</Link>}
    </article>;
  }

  return <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8"><ArrowLeft size={16} />Back to dashboard</Link>
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
      <div><p className="eyebrow mb-3">REAL-LIFE MISSIONS · {languageName}</p><h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">Learn it. Hear it. Use it.</h1><p className="text-slate-400 mt-3 max-w-xl">Small situations that build toward something you can do outside the app.</p></div>
      <label className="text-sm text-slate-400">Mission language<select aria-label="Mission language" value={language} onChange={(event) => navigate(`/missions/${event.target.value}`)} className="block w-full sm:w-40 bg-slate-900 border border-slate-700 rounded-xl p-3 mt-2 text-white">{LANGUAGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    </div>
    <section className="study-hero rounded-2xl p-6 sm:p-8 mb-8" aria-labelledby="mission-goal">
      <div className="flex items-center gap-2 text-emerald-300 mb-3"><Target size={20} /><h2 id="mission-goal" className="font-semibold">What would you like to do?</h2></div>
      <p className="text-slate-300 text-sm mb-5">Choose a goal to shape your next story and conversation. You can change it any time.</p>
      <div className="flex flex-wrap gap-2">{GOALS.map((item) => <button key={item.id} type="button" aria-pressed={goal === item.id} onClick={() => chooseGoal(item.id)} className={`rounded-xl px-4 py-3 text-sm border ${goal === item.id ? 'bg-emerald-300 text-slate-950 border-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'}`}>{item.label}</button>)}</div>
      <div className="mt-6 grid sm:grid-cols-3 gap-4 text-sm text-slate-300"><span className="flex items-center gap-2"><Headphones size={17} className="text-emerald-300" />Follow a short story</span><span className="flex items-center gap-2"><MessageCircle size={17} className="text-emerald-300" />Make your own response</span><span className="flex items-center gap-2"><CalendarClock size={17} className="text-emerald-300" />Try a fresh situation later</span></div>
    </section>
    {due.length > 0 && <section aria-label="Ready delayed checks" className="rounded-2xl border border-amber-300/30 bg-amber-300/5 p-6 mb-8"><h2 className="font-semibold text-amber-200">What stayed with you?</h2><p className="text-sm text-slate-300 mt-2 mb-4">Try without hints. Your first delayed check introduces different details; later checks revisit that situation to check retention.</p><div className="flex flex-wrap gap-3">{due.map((mission) => <Link key={mission.id} className="inline-flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm" to={`/missions/${language}/${mission.id}?mode=transfer`}>{mission.title}<ArrowRight size={16} /></Link>)}</div></section>}
    <div className="grid lg:grid-cols-3 gap-5 mb-10">{visible.map(missionCard)}</div>
    <section aria-labelledby="ability-heading" className="surface-card rounded-2xl p-6 sm:p-8 mb-6">
      <h2 id="ability-heading" className="text-xl font-semibold">One phrase. Different skills.</h2><p className="text-sm text-slate-400 mt-2 mb-6">Recent mission results stay separate, so recognizing a phrase never counts as being able to say it.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">{ABILITIES.map(({ id, label, description }) => {
        const item = stats[id];
        return <div key={id}><h3 className="text-sm font-semibold text-slate-200">{label}</h3><p className="text-2xl font-display font-semibold mt-2">{id === 'use' ? item.selfAssessed : item.attempts ? `${item.correct}/${item.attempts}` : '—'}</p><p className="text-xs text-slate-400 mt-1">{id === 'use' ? 'self-assessed responses' : 'correct · unaided checks'}</p><p className="text-sm text-slate-400 mt-3">{description}</p>{id !== 'use' && item.assisted > 0 && <p className="text-xs text-amber-200 mt-2">{item.assisted} assisted · counted separately</p>}</div>;
      })}</div>
    </section>
    <div className="grid md:grid-cols-2 gap-6">
      <section className="surface-card rounded-2xl p-6" aria-labelledby="clinic-heading"><div className="flex items-center gap-2 text-emerald-300"><Sparkles size={18} /><h2 id="clinic-heading" className="font-semibold">Make your mistakes useful</h2></div><p className="text-slate-400 text-sm mt-3">{weaknesses.length ? `${weaknesses.length} phrase patterns could use focused practice. Get a specific explanation, then try them again.` : 'As you practice, missed phrase patterns will appear here with explanations and focused recall.'}</p><Link to={`/missions/${language}/clinic`} className="inline-flex items-center gap-2 text-sm text-emerald-300 mt-5">Open mistake practice<ArrowRight size={16} /></Link></section>
      <section className="surface-card rounded-2xl p-6" aria-labelledby="retention-heading"><h2 id="retention-heading" className="font-semibold">Remember it beyond today</h2><p className="text-slate-400 text-sm mt-3">A fresh-situation check opens 7 days after a mission, then 30 days after each completed delayed check. Extra practice never postpones it.</p><p className="text-sm text-emerald-300 mt-4">{transferAttempts.length ? `${successfulTransfer}/${transferAttempts.length} unaided answers correct in delayed checks` : 'Complete a mission to schedule your first delayed check.'}</p></section>
    </div>
    <p className="text-xs text-slate-500 mt-8 leading-relaxed">Authored starter curriculum · Speaking is self-assessed. Delayed checks are learning signals, not a proficiency certification. Qualified-speaker review is still pending.</p>
  </main>;
}

export function MissionHub() {
  const { language } = useParams();
  const supported = LANGUAGES.find((item) => item.id === language);
  if (!supported) return <main id="main-content" className="p-8 text-center"><h1>Choose a supported language</h1><Link className="text-emerald-300 underline" to="/">Back to dashboard</Link></main>;
  return <MissionCollection key={supported.id} language={supported.id} />;
}
