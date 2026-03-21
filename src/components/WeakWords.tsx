import { useMemo } from 'react';
import { AlertTriangle, TrendingDown, BookOpen, Trophy } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getWeakWords, getMasteryBreakdown, getWordsDueForReview, wordPerfKey } from '../lib/persistence';
import type { Language } from '../types/language';

export function WeakWords({ language }: { language: Language }) {
  const wordPerformance = useAppStore((s) => s.wordPerformance);

  const weakWords = useMemo(() => getWeakWords(wordPerformance, language, 8), [wordPerformance, language]);
  const mastery = useMemo(() => getMasteryBreakdown(wordPerformance, language), [wordPerformance, language]);
  const dueCount = useMemo(() => getWordsDueForReview(wordPerformance, language).length, [wordPerformance, language]);

  const totalTracked = mastery.mastered + mastery.learning + mastery.struggling;

  if (totalTracked === 0) {
    return (
      <div className="glass rounded-2xl p-6 relative overflow-hidden noise">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
          <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
          Word Mastery
        </h3>
        <p className="text-sm text-slate-500">Complete some lessons to see your word mastery breakdown here.</p>
      </div>
    );
  }

  const masteryTotal = mastery.mastered + mastery.learning + mastery.struggling;

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden noise">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full pointer-events-none" />

      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.15em] mb-5 flex items-center gap-2">
        <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
        Word Mastery
      </h3>

      {/* Mastery bar */}
      <div className="mb-5">
        <div className="flex gap-1 h-2.5 rounded-full overflow-hidden bg-slate-800">
          {mastery.mastered > 0 && (
            <div
              className="bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(mastery.mastered / masteryTotal) * 100}%` }}
            />
          )}
          {mastery.learning > 0 && (
            <div
              className="bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${(mastery.learning / masteryTotal) * 100}%` }}
            />
          )}
          {mastery.struggling > 0 && (
            <div
              className="bg-red-500 rounded-full transition-all duration-500"
              style={{ width: `${(mastery.struggling / masteryTotal) * 100}%` }}
            />
          )}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Mastered ({mastery.mastered})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Learning ({mastery.learning})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Struggling ({mastery.struggling})
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{totalTracked}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Words Seen</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-400 tabular-nums">{mastery.mastered}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Mastered</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-400 tabular-nums">{dueCount}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Due Review</p>
        </div>
      </div>

      {/* Weak words list */}
      {weakWords.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Words to Focus On
          </h4>
          <div className="space-y-1.5">
            {weakWords.map((wp) => {
              const total = wp.timesCorrect + wp.timesIncorrect;
              const accuracy = total > 0 ? Math.round((wp.timesCorrect / total) * 100) : 0;
              return (
                <div key={wordPerfKey(wp.language, wp.rank)} className="flex items-center justify-between px-3 py-2 bg-slate-800/40 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white">{wp.word}</span>
                    <span className="text-xs text-slate-500">{wp.translation}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${accuracy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums w-8 text-right">{accuracy}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {weakWords.length === 0 && mastery.mastered > 0 && (
        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-xl">
          <Trophy className="w-5 h-5 text-emerald-400" />
          <p className="text-sm text-emerald-300">Great work! No struggling words right now.</p>
        </div>
      )}
    </div>
  );
}
