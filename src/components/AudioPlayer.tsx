import { Volume2, Loader2, Square } from 'lucide-react';
import { useState } from 'react';
import { useAudio } from '../hooks/useAudio';
import type { Language } from '../types/language';

interface Props {
  text: string;
  language: Language;
  size?: 'sm' | 'md';
}

const SPEEDS = [0.5, 0.75, 1, 1.25];

export function AudioPlayer({ text, language, size = 'md' }: Props) {
  const { play, stop, isPlaying, isLoading } = useAudio();
  const [speed, setSpeed] = useState(1);

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => (isPlaying ? stop() : play(text, language, speed))}
        disabled={isLoading}
        className={`${
          size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
        } rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white flex items-center justify-center transition-all duration-200 disabled:opacity-50 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30`}
      >
        {isLoading ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : isPlaying ? (
          <Square className={iconSize} />
        ) : (
          <Volume2 className={iconSize} />
        )}
      </button>
      {size === 'md' && (
        <div className="flex gap-0.5 bg-slate-800/50 rounded-lg p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                speed === s
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
