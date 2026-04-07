import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Pencil, Mic, RotateCcw, Lock, ChevronDown, ChevronRight, Check, Circle, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { LanguageSelector } from '../components/LanguageSelector';
import { ProgressBar } from '../components/ProgressBar';
import { WeakWords } from '../components/WeakWords';
import {
  isLessonUnlocked,
  isSectionUnlocked,
  isLevelComplete,
  getCompletedLessonsInLevel,
  getCompletedLevelCount,
  getTotalCompletedLevels,
  TOTAL_LEVELS,
  LESSONS_PER_LEVEL,
} from '../lib/persistence';
import type { LessonType } from '../types/lesson';

const WORDS_PER_LEVEL = 50;
const WORDS_PER_LESSON = 10;

const SECTIONS: { type: LessonType; label: string; icon: React.ReactNode; gradient: string }[] = [
  { type: 'reading', label: 'Reading', icon: <BookOpen className="w-5 h-5" />, gradient: 'from-emerald-500 to-cyan-500' },
  { type: 'writing', label: 'Writing', icon: <Pencil className="w-5 h-5" />, gradient: 'from-violet-500 to-purple-500' },
  { type: 'speaking', label: 'Speaking', icon: <Mic className="w-5 h-5" />, gradient: 'from-amber-500 to-orange-500' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { language, setLanguage, progress } = useAppStore();
  const [expandedLevel, setExpandedLevel] = useState<Record<string, boolean>>({});

  const hasCompletedAny = getTotalCompletedLevels(progress, language) > 0;

  function toggleLevel(type: LessonType, level: number) {
    const key = `${type}-${level}`;
    setExpandedLevel((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function getLessonStatus(type: LessonType, level: number, lesson: number): 'locked' | 'available' | 'completed' {
    const key = `${level}-${lesson}`;
    if (progress[language]?.[type]?.[key]?.completed) return 'completed';
    if (isLessonUnlocked(progress, language, type, level, lesson)) return 'available';
    return 'locked';
  }

  function getLevelStatus(type: LessonType, level: number): 'locked' | 'available' | 'in-progress' | 'completed' {
    if (isLevelComplete(progress, language, type, level)) return 'completed';
    const completed = getCompletedLessonsInLevel(progress, language, type, level);
    if (completed > 0) return 'in-progress';
    if (isLessonUnlocked(progress, language, type, level, 1)) return 'available';
    return 'locked';
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Hero section */}
      <div className="mb-10">
        <h2 className="text-3xl font-display font-bold text-white mb-1">
          Choose your language
        </h2>
        <p className="text-slate-500 text-sm mb-6">Master 800 words through reading, writing, and speaking</p>
        <LanguageSelector selected={language} onChange={setLanguage} />
      </div>

      {/* Progress card */}
      <div className="glass rounded-2xl p-6 mb-8 relative overflow-hidden noise">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none" />
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.15em] mb-5 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Your Progress
        </h3>
        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <ProgressBar
              key={s.type}
              label={s.label}
              completed={getCompletedLevelCount(progress, language, s.type)}
              total={TOTAL_LEVELS}
            />
          ))}
        </div>
      </div>

      {/* Word Mastery */}
      <div className="mb-8">
        <WeakWords language={language} />
      </div>

      {/* Flashcard review button */}
      {hasCompletedAny && (
        <button
          onClick={() => navigate(`/review/${language}`)}
          className="mb-10 group flex items-center gap-3 px-6 py-4 rounded-2xl glass-light hover:border-amber-500/30 transition-all duration-300 glow-amber"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <RotateCcw className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">Review Flashcards</p>
            <p className="text-xs text-slate-500">Revisit words from completed lessons</p>
          </div>
        </button>
      )}

      {/* Lesson sections */}
      {SECTIONS.map((section) => {
        const sectionOpen = isSectionUnlocked(progress, language, section.type);
        const prerequisite = section.type === 'writing' ? 'Reading' : section.type === 'speaking' ? 'Writing' : null;

        return (
          <div key={section.type} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${section.gradient} flex items-center justify-center ${
                sectionOpen ? 'opacity-100 shadow-lg' : 'opacity-30'
              }`}>
                <span className="text-white">{section.icon}</span>
              </div>
              <h3 className={`text-lg font-display font-semibold ${sectionOpen ? 'text-white' : 'text-slate-600'}`}>
                {section.label}
              </h3>
              {!sectionOpen && (
                <span className="flex items-center gap-1.5 text-xs text-slate-600 ml-1 glass-light px-3 py-1.5 rounded-full">
                  <Lock className="w-3 h-3" />
                  Complete all {prerequisite} to unlock
                </span>
              )}
            </div>

            <div className={`space-y-1.5 ${!sectionOpen ? 'opacity-30 pointer-events-none' : ''}`}>
              {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map((level) => {
                const levelStatus = getLevelStatus(section.type, level);
                const isExpanded = expandedLevel[`${section.type}-${level}`];
                const completedInLevel = getCompletedLessonsInLevel(progress, language, section.type, level);
                const wordStart = (level - 1) * WORDS_PER_LEVEL + 1;
                const wordEnd = level * WORDS_PER_LEVEL;

                return (
                  <div
                    key={level}
                    className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                      levelStatus === 'completed'
                        ? 'glass glow-emerald'
                        : levelStatus === 'locked'
                        ? 'bg-slate-900/30 border border-slate-800/50'
                        : 'glass'
                    } ${isExpanded ? 'ring-1 ring-slate-700/50' : ''}`}
                  >
                    {/* Level header */}
                    <button
                      onClick={() => levelStatus !== 'locked' && toggleLevel(section.type, level)}
                      disabled={levelStatus === 'locked'}
                      className={`w-full flex items-center justify-between px-5 py-4 transition-all duration-200 ${
                        levelStatus === 'locked'
                          ? 'cursor-not-allowed'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {levelStatus === 'locked' ? (
                          <div className="w-7 h-7 rounded-lg bg-slate-800/50 flex items-center justify-center">
                            <Lock className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                        ) : levelStatus === 'completed' ? (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-slate-800/50 flex items-center justify-center">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        )}
                        <div className="text-left">
                          <span className={`text-sm font-semibold ${levelStatus === 'locked' ? 'text-slate-600' : 'text-white'}`}>
                            Level {level}
                          </span>
                          <span className="text-xs text-slate-600 ml-2">
                            Words {wordStart}–{wordEnd}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-500 tabular-nums">
                          {completedInLevel}/{LESSONS_PER_LEVEL}
                        </span>
                        <div className="flex gap-1.5">
                          {Array.from({ length: LESSONS_PER_LEVEL }, (_, i) => {
                            const status = getLessonStatus(section.type, level, i + 1);
                            return (
                              <div
                                key={i}
                                className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                                  status === 'completed'
                                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40'
                                    : status === 'available'
                                    ? 'border border-slate-500 bg-transparent'
                                    : 'bg-slate-800'
                                }`}
                              >
                                {status === 'completed' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </button>

                    {/* Expanded lessons */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1">
                        <div className="grid grid-cols-5 gap-2">
                          {Array.from({ length: LESSONS_PER_LEVEL }, (_, i) => i + 1).map((lessonNum) => {
                            const status = getLessonStatus(section.type, level, lessonNum);
                            const lStart = wordStart + (lessonNum - 1) * WORDS_PER_LESSON;
                            const lEnd = lStart + WORDS_PER_LESSON - 1;

                            return (
                              <button
                                key={lessonNum}
                                onClick={() => navigate(`/lesson/${language}/${section.type}/${level}/${lessonNum}`)}
                                disabled={status === 'locked'}
                                className={`group relative p-4 rounded-xl text-center transition-all duration-200 ${
                                  status === 'locked'
                                    ? 'bg-slate-900/40 opacity-40 cursor-not-allowed'
                                    : status === 'completed'
                                    ? 'bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/15'
                                    : 'bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/60'
                                }`}
                              >
                                <div className="flex items-center justify-center gap-1 mb-1.5">
                                  <span className={`text-sm font-semibold ${
                                    status === 'locked' ? 'text-slate-600' : 'text-white'
                                  }`}>
                                    {lessonNum}
                                  </span>
                                  {status === 'completed' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                  {status === 'locked' && <Lock className="w-3 h-3 text-slate-700" />}
                                  {status === 'available' && <Circle className="w-3 h-3 text-slate-600" />}
                                </div>
                                <p className="text-[10px] text-slate-600 tabular-nums">{lStart}–{lEnd}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
