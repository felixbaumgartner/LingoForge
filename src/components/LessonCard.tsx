import { Lock, Check, Circle } from 'lucide-react';
import type { LessonType } from '../types/lesson';

interface Props {
  level: number;
  type: LessonType;
  wordRange: [number, number];
  status: 'locked' | 'available' | 'completed';
  onClick: () => void;
}

export function LessonCard({ level, wordRange, status, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={status === 'locked'}
      className={`p-4 rounded-xl border text-left transition-all ${
        status === 'locked'
          ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
          : status === 'completed'
          ? 'bg-emerald-950/50 border-emerald-800 hover:border-emerald-600'
          : 'bg-slate-800 border-slate-700 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">Level {level}</span>
        {status === 'locked' && <Lock className="w-4 h-4 text-slate-600" />}
        {status === 'completed' && <Check className="w-4 h-4 text-emerald-400" />}
        {status === 'available' && <Circle className="w-4 h-4 text-slate-500" />}
      </div>
      <p className="text-xs text-slate-400">
        Words {wordRange[0]}–{wordRange[1]}
      </p>
    </button>
  );
}
