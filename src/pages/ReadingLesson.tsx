import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useLesson } from '../hooks/useLesson';
import { useAppStore } from '../store/appStore';
import { AudioPlayer } from '../components/AudioPlayer';
import { LESSONS_PER_LEVEL, TOTAL_LEVELS } from '../lib/persistence';
import type { Language } from '../types/language';
import type { ReadingLesson as ReadingLessonType } from '../types/lesson';

function InteractivePassage({ passage, vocabulary }: {
  passage: string;
  vocabulary: { word: string; translation: string }[];
}) {
  const vocabMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of vocabulary) {
      map.set(v.word.toLowerCase(), v.translation);
    }
    return map;
  }, [vocabulary]);

  const pattern = useMemo(() => {
    if (vocabulary.length === 0) return null;
    const escaped = vocabulary.map((v) =>
      v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    return new RegExp(`(\\b(?:${escaped.join('|')})\\b)`, 'gi');
  }, [vocabulary]);

  if (!pattern) {
    return <span>{passage}</span>;
  }

  const parts = passage.split(pattern);

  return (
    <span>
      {parts.map((part, i) => {
        const translation = vocabMap.get(part.toLowerCase());
        if (translation) {
          return (
            <span key={i} className="relative group/word inline-block">
              <span className="text-emerald-300 underline decoration-emerald-500/30 decoration-dotted underline-offset-4 cursor-help transition-colors group-hover/word:text-emerald-200 group-hover/word:decoration-emerald-400/60">
                {part}
              </span>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white whitespace-nowrap opacity-0 scale-95 group-hover/word:opacity-100 group-hover/word:scale-100 transition-all duration-200 shadow-xl z-10">
                {translation}
                <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-700" />
              </span>
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function ReadingLesson() {
  const { language, level, lesson: lessonParam } = useParams<{ language: string; type: string; level: string; lesson: string }>();
  const navigate = useNavigate();
  const completeLesson = useAppStore((s) => s.completeLesson);
  const recordWord = useAppStore((s) => s.recordWord);
  const { lesson, isLoading, error, loadLesson } = useLesson();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showTranslation, setShowTranslation] = useState<number | null>(null);
  // Vocab quiz state
  const [vocabAnswers, setVocabAnswers] = useState<Record<number, number>>({});
  const [vocabSubmitted, setVocabSubmitted] = useState(false);

  const lang = language as Language;
  const lvl = Number(level);
  const lessonNum = Number(lessonParam);

  useEffect(() => {
    if (lang && lvl && lessonNum) {
      loadLesson(lang, 'reading', lvl, lessonNum);
      setAnswers({});
      setSubmitted(false);
      setShowTranslation(null);
      setVocabAnswers({});
      setVocabSubmitted(false);
    }
  }, [lang, lvl, lessonNum, loadLesson]);

  // Build vocab quiz — must be before early returns to satisfy React hooks rules
  const data = (lesson?.type === 'reading' ? lesson : null) as ReadingLessonType | null;
  const corpusWords = data?.corpusWords ?? [];
  const vocabQuizItems = useMemo(() => {
    if (corpusWords.length === 0) return [];
    const translations = corpusWords.map((w) => w.translation);
    return corpusWords.map((w, idx) => {
      const wrong = translations.filter((_, i) => i !== idx).sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [...wrong, w.translation].sort(() => Math.random() - 0.5);
      const correctIdx = options.indexOf(w.translation);
      return { word: w.word, rank: w.rank, translation: w.translation, options, correctIndex: correctIdx };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(corpusWords)]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center glass rounded-2xl px-12 py-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-5">
            <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
          </div>
          <p className="text-white font-medium mb-1">Generating your lesson</p>
          <p className="text-xs text-slate-500">Crafting exercises from your word list...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => loadLesson(lang, 'reading', lvl, lessonNum)} className="px-4 py-2 bg-slate-700 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const totalQuestions = data.questions?.length ?? 0;
  const correctCount = submitted
    ? data.questions.filter((q, i) => answers[i] === q.correctIndex).length
    : 0;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = score >= 60;

  const vocabCorrectCount = vocabSubmitted
    ? vocabQuizItems.filter((item, i) => vocabAnswers[i] === item.correctIndex).length
    : 0;

  function handleSubmit() {
    setSubmitted(true);
    if (passed) {
      completeLesson(lang, 'reading', lvl, lessonNum, score);
    }
  }

  function handleVocabSubmit() {
    setVocabSubmitted(true);
    // Record per-word performance
    for (let i = 0; i < vocabQuizItems.length; i++) {
      const item = vocabQuizItems[i];
      const correct = vocabAnswers[i] === item.correctIndex;
      recordWord(lang, item.rank, item.word, item.translation, correct);
    }
  }

  function goToNext() {
    if (lessonNum < LESSONS_PER_LEVEL) {
      navigate(`/lesson/${lang}/reading/${lvl}/${lessonNum + 1}`);
    } else if (lvl < TOTAL_LEVELS) {
      navigate(`/lesson/${lang}/reading/${lvl + 1}/1`);
    } else {
      navigate('/');
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-white mb-8 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="mb-1.5 text-xs font-semibold text-emerald-400/80 uppercase tracking-[0.15em]">
        Reading &middot; Level {lvl}, Lesson {lessonNum} &middot; {lang}
      </div>
      <h2 className="text-2xl font-display font-bold text-white mb-8">{data.title}</h2>

      {/* Passage */}
      <div className="glass rounded-2xl p-7 mb-8 relative overflow-hidden noise">
        <p className="text-lg text-slate-200 leading-relaxed whitespace-pre-wrap">
          <InteractivePassage passage={data.passage} vocabulary={data.vocabulary ?? []} />
        </p>
        <div className="mt-4 flex items-center justify-between">
          <AudioPlayer text={data.passage} language={lang} />
          <button
            onClick={() => setShowTranslation(showTranslation === -1 ? null : -1)}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            {showTranslation === -1 ? 'Hide' : 'Show'} translation
          </button>
        </div>
        {showTranslation === -1 && (
          <p className="mt-3 text-sm text-slate-400 italic">{data.passageTranslation}</p>
        )}
      </div>

      {/* Vocabulary */}
      {data.vocabulary && data.vocabulary.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Vocabulary</h3>
          <div className="grid grid-cols-2 gap-2">
            {data.vocabulary.map((v, i) => (
              <button
                key={i}
                onClick={() => setShowTranslation(showTranslation === i ? null : i)}
                className="bg-slate-800 rounded-lg p-3 text-left hover:bg-slate-750 transition-colors"
              >
                <span className="text-emerald-400 font-medium">{v.word}</span>
                {showTranslation === i && (
                  <span className="text-slate-400 ml-2">— {v.translation}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comprehension Questions */}
      {data.questions && data.questions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Comprehension</h3>
          <div className="space-y-6">
            {data.questions.map((q, qi) => (
              <div key={qi}>
                <p className="text-white mb-3">{qi + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const isSelected = answers[qi] === oi;
                    const isCorrect = submitted && oi === q.correctIndex;
                    const isWrong = submitted && isSelected && oi !== q.correctIndex;
                    return (
                      <button
                        key={oi}
                        onClick={() => !submitted && setAnswers({ ...answers, [qi]: oi })}
                        disabled={submitted}
                        className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors ${
                          isCorrect ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                          : isWrong ? 'border-red-500 bg-red-950/50 text-red-300'
                          : isSelected ? 'border-emerald-500 bg-slate-700 text-white'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < totalQuestions}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-500/20 disabled:shadow-none"
        >
          Check Answers
        </button>
      ) : !vocabSubmitted && vocabQuizItems.length > 0 ? (
        <>
          {/* Comprehension result */}
          <div className="glass rounded-2xl p-6 mb-8 text-center relative overflow-hidden noise">
            <p className="text-lg font-display font-bold text-white mb-1">{correctCount}/{totalQuestions} comprehension correct</p>
            <p className="text-sm text-slate-400">
              {passed ? 'Great reading! Now test your vocabulary below.' : 'You need 60% to pass. Complete the vocab quiz, then you can retry.'}
            </p>
          </div>

          {/* Vocab Quiz */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Vocabulary Quiz</h3>
            <p className="text-xs text-slate-500 mb-4">Match each word to its English translation</p>
            <div className="space-y-5">
              {vocabQuizItems.map((item, qi) => (
                <div key={qi}>
                  <p className="text-white font-medium mb-2">{qi + 1}. <span className="text-emerald-400">{item.word}</span></p>
                  <div className="grid grid-cols-2 gap-2">
                    {item.options.map((opt, oi) => {
                      const isSelected = vocabAnswers[qi] === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() => setVocabAnswers({ ...vocabAnswers, [qi]: oi })}
                          className={`text-left px-3 py-2 rounded-lg border transition-colors text-sm ${
                            isSelected ? 'border-emerald-500 bg-slate-700 text-white'
                            : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleVocabSubmit}
            disabled={Object.keys(vocabAnswers).length < vocabQuizItems.length}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-500/20 disabled:shadow-none"
          >
            Submit Vocabulary Quiz
          </button>
        </>
      ) : (
        <div className="glass rounded-2xl p-8 text-center relative overflow-hidden noise">
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            passed ? 'bg-emerald-500/15' : 'bg-amber-500/15'
          }`}>
            <CheckCircle2 className={`w-8 h-8 ${passed ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <p className="text-2xl font-display font-bold text-white mb-1">{correctCount}/{totalQuestions} comprehension</p>
          {vocabQuizItems.length > 0 && (
            <p className="text-lg text-slate-300 mb-1">{vocabCorrectCount}/{vocabQuizItems.length} vocabulary</p>
          )}
          <p className="text-sm text-slate-400 mb-6">
            {passed ? 'Excellent work! On to the next one.' : 'You need 60% comprehension to pass. Give it another shot!'}
          </p>
          <div className="flex gap-3 justify-center">
            {!passed && (
              <button
                onClick={() => { setAnswers({}); setSubmitted(false); setVocabAnswers({}); setVocabSubmitted(false); }}
                className="px-6 py-2.5 glass-light hover:bg-slate-700/50 text-white rounded-xl font-medium transition-colors"
              >
                Retry
              </button>
            )}
            <button
              onClick={passed ? goToNext : () => navigate('/')}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20"
            >
              {passed ? 'Next Lesson' : 'Back to Dashboard'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
