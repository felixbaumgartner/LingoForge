import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingDown, Trophy, Zap } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getWeakWords, getMasteryBreakdown, wordPerfKey } from '../lib/persistence';
import type { Language } from '../types/language';

export function WeakWords({ language }: { language: Language }) {
  const wordPerformance = useAppStore((s) => s.wordPerformance);
  const navigate = useNavigate();

  const weakWords = useMemo(() => getWeakWords(wordPerformance, language, 8), [wordPerformance, language]);
  const mastery = useMemo(() => getMasteryBreakdown(wordPerformance, language), [wordPerformance, language]);

  const totalTracked = mastery.mastered + mastery.learning + mastery.struggling;
  const needsReviewCount = totalTracked - mastery.mastered;

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
          <p className="text-lg font-bold text-amber-400 tabular-nums">{needsReviewCount}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Need Review</p>
        </div>
      </div>

      {/* Weak words list */}
      {weakWords.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Words to Focus On
          </h4>
          <p className="text-xs text-slate-600 mb-3">Your accuracy on words you've been getting wrong</p>
          <div className="space-y-1.5">
            {weakWords.map((wp) => {
              const total = wp.timesCorrect + wp.timesIncorrect;
              const accuracy = total > 0 ? Math.round((wp.timesCorrect / total) * 100) : 0;
              return (
                <div
                  key={wordPerfKey(wp.language, wp.rank)}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-800/40 rounded-lg"
                  title={`${wp.timesCorrect} correct out of ${total} attempts`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-slate-700/60 text-sm font-semibold text-white">{wp.word}</span>
                    <span className="text-sm text-slate-400 truncate">{wp.translation}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-600 tabular-nums">{wp.timesCorrect}/{total}</span>
                    <div className="w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${accuracy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                    <span className={`text-xs tabular-nums w-9 text-right ${accuracy >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{accuracy}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Practice button */}
          <button
            onClick={() => navigate(`/review/${language}?focus=weak`)}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500/20 to-amber-500/20 border border-red-500/30 hover:border-red-500/50 text-white font-medium text-sm transition-all duration-200 hover:from-red-500/30 hover:to-amber-500/30"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            Practice Weak Words
          </button>
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
