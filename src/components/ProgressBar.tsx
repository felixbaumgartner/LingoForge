interface Props {
  label: string;
  completed: number;
  total: number;
}

export function ProgressBar({ label, completed, total }: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-slate-400 w-20">{label}</span>
      <div className="flex-1 h-2 bg-slate-800/80 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #34d399, #06b6d4)',
          }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-500 w-12 text-right tabular-nums">
        {pct}%
      </span>
    </div>
  );
}
