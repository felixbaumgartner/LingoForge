import { LANGUAGES, type Language } from '../types/language';

interface Props {
  selected: Language;
  onChange: (lang: Language) => void;
}

export function LanguageSelector({ selected, onChange }: Props) {
  return (
    <div className="flex gap-1.5 sm:gap-2" aria-label="Learning language">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.id}
          aria-pressed={selected === lang.id}
          onClick={() => onChange(lang.id)}
          className={`group relative px-3 sm:px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
            selected === lang.id
              ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              : 'glass-light text-slate-400 hover:text-white hover:border-slate-600'
          }`}
        >
          <span className="text-base mr-1.5" aria-hidden="true">{lang.flag}</span>
          {lang.label}
          {selected === lang.id && (
            <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
