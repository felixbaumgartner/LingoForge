import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useLesson } from '../hooks/useLesson';
import { useAppStore } from '../store/appStore';
import { LESSONS_PER_LEVEL, TOTAL_LEVELS, normalizeAnswer } from '../lib/persistence';
import type { Language } from '../types/language';
import type { WritingLesson as WritingLessonType, WritingExercise, CorpusWord } from '../types/lesson';

function ExerciseItem({ exercise, submitted, userAnswer, onAnswer }: {
  exercise: WritingExercise;
  submitted: boolean;
  userAnswer: string;
  onAnswer: (val: string) => void;
}) {
  const isCorrect = submitted && normalizeAnswer(userAnswer) === normalizeAnswer(exercise.answer);
  const isWrong = submitted && !isCorrect && userAnswer.length > 0;

  if (exercise.type === 'multiple-choice') {
    return (
      <div className="bg-slate-800 rounded-xl p-5">
        <p className="text-sm text-slate-400 mb-1">{exercise.instruction}</p>
        <p className="text-white font-medium mb-3">{exercise.word}</p>
        <div className="space-y-2">
          {exercise.options?.map((opt, oi) => {
            const selected = userAnswer === String(oi);
            const correct = submitted && oi === exercise.correctIndex;
            const wrong = submitted && selected && oi !== exercise.correctIndex;
            return (
              <button
                key={oi}
                onClick={() => !submitted && onAnswer(String(oi))}
                disabled={submitted}
                className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                  correct ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                  : wrong ? 'border-red-500 bg-red-950/50 text-red-300'
                  : selected ? 'border-emerald-500 bg-slate-700 text-white'
                  : 'border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (exercise.type === 'word-order') {
    return (
      <div className="bg-slate-800 rounded-xl p-5">
        <p className="text-sm text-slate-400 mb-1">{exercise.instruction}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {exercise.words?.map((w, wi) => (
            <span key={wi} className="px-3 py-1.5 bg-slate-700 text-slate-200 rounded-lg text-sm">{w}</span>
          ))}
        </div>
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => !submitted && onAnswer(e.target.value)}
          disabled={submitted}
          placeholder="Type the sentence in order..."
          className={`w-full px-4 py-2.5 rounded-lg border bg-slate-900 text-white placeholder-slate-500 ${
            isCorrect ? 'border-emerald-500' : isWrong ? 'border-red-500' : 'border-slate-700'
          }`}
        />
        {submitted && (
          <p className={`text-sm mt-2 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
            {isCorrect ? 'Correct!' : `Answer: ${exercise.answer}`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-5">
      <p className="text-sm text-slate-400 mb-1">{exercise.instruction}</p>
      {exercise.sentence && <p className="text-white mb-3">{exercise.sentence}</p>}
      {exercise.hint && <p className="text-xs text-slate-500 mb-2">Hint: {exercise.hint}</p>}
      <input
        type="text"
        value={userAnswer}
        onChange={(e) => !submitted && onAnswer(e.target.value)}
        disabled={submitted}
        placeholder={exercise.type === 'translation' ? 'Type your translation...' : 'Type the missing word...'}
        className={`w-full px-4 py-2.5 rounded-lg border bg-slate-900 text-white placeholder-slate-500 ${
          isCorrect ? 'border-emerald-500' : isWrong ? 'border-red-500' : 'border-slate-700'
        }`}
      />
      {submitted && (
        <p className={`text-sm mt-2 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
          {isCorrect ? 'Correct!' : `Answer: ${exercise.answer}`}
        </p>
      )}
    </div>
  );
}

export function WritingLesson() {
  const { language, level, lesson: lessonParam } = useParams<{ language: string; type: string; level: string; lesson: string }>();
  const navigate = useNavigate();
  const completeLesson = useAppStore((s) => s.completeLesson);
  const recordWord = useAppStore((s) => s.recordWord);
  const { lesson, isLoading, error, loadLesson } = useLesson();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const lang = language as Language;
  const lvl = Number(level);
  const lessonNum = Number(lessonParam);

  useEffect(() => {
    if (lang && lvl && lessonNum) {
      loadLesson(lang, 'writing', lvl, lessonNum);
      setAnswers({});
      setSubmitted(false);
    }
  }, [lang, lvl, lessonNum, loadLesson]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center glass rounded-2xl px-12 py-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-5">
            <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
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
        <button onClick={() => loadLesson(lang, 'writing', lvl, lessonNum)} className="px-4 py-2 bg-slate-700 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  if (!lesson || lesson.type !== 'writing') return null;

  const data = lesson as WritingLessonType;
  const exercises = data.exercises ?? [];
  const total = exercises.length;

  const correctCount = exercises.filter((ex, i) => {
    if (ex.type === 'multiple-choice') return answers[i] === String(ex.correctIndex);
    return normalizeAnswer(answers[i] || '') === normalizeAnswer(ex.answer);
  }).length;

  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const passed = score >= 60;

  function handleSubmit() {
    setSubmitted(true);
    if (passed) completeLesson(lang, 'writing', lvl, lessonNum, score);

    // Record per-word performance using corpus words
    const corpusWords: CorpusWord[] = data.corpusWords ?? [];
    if (corpusWords.length > 0) {
      const corpusMap = new Map(corpusWords.map((w) => [w.word.toLowerCase(), w]));
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        let correct: boolean;
        if (ex.type === 'multiple-choice') {
          correct = answers[i] === String(ex.correctIndex);
        } else {
          correct = normalizeAnswer(answers[i] || '') === normalizeAnswer(ex.answer);
        }
        // Map exercise to corpus word: use answer word or exercise.word
        const targetWord = (ex.answer || ex.word || '').toLowerCase();
        const corpus = corpusMap.get(targetWord);
        if (corpus) {
          recordWord(lang, corpus.rank, corpus.word, corpus.translation, correct);
        }
      }
    }
  }

  function goToNext() {
    if (lessonNum < LESSONS_PER_LEVEL) {
      navigate(`/lesson/${lang}/writing/${lvl}/${lessonNum + 1}`);
    } else if (lvl < TOTAL_LEVELS) {
      navigate(`/lesson/${lang}/writing/${lvl + 1}/1`);
    } else {
      navigate('/');
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-white mb-8 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="mb-1.5 text-xs font-semibold text-violet-400/80 uppercase tracking-[0.15em]">
        Writing &middot; Level {lvl}, Lesson {lessonNum} &middot; {lang}
      </div>
      <h2 className="text-2xl font-display font-bold text-white mb-8">{data.title}</h2>

      <div className="space-y-4 mb-8">
        {exercises.map((ex, i) => (
          <ExerciseItem
            key={i}
            exercise={ex}
            submitted={submitted}
            userAnswer={answers[i] || ''}
            onAnswer={(val) => setAnswers({ ...answers, [i]: val })}
          />
        ))}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-violet-500/20"
        >
          Check Answers
        </button>
      ) : (
        <div className="glass rounded-2xl p-8 text-center relative overflow-hidden noise">
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            passed ? 'bg-emerald-500/15' : 'bg-amber-500/15'
          }`}>
            <CheckCircle2 className={`w-8 h-8 ${passed ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <p className="text-2xl font-display font-bold text-white mb-1">{correctCount}/{total} correct</p>
          <p className="text-sm text-slate-400 mb-6">
            {passed ? 'Excellent work! On to the next one.' : 'You need 60% to pass. Give it another shot!'}
          </p>
          <div className="flex gap-3 justify-center">
            {!passed && (
              <button onClick={() => { setAnswers({}); setSubmitted(false); }} className="px-6 py-2.5 glass-light hover:bg-slate-700/50 text-white rounded-xl font-medium transition-colors">
                Retry
              </button>
            )}
            <button
              onClick={passed ? goToNext : () => navigate('/')}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-violet-500/20"
            >
              {passed ? 'Next Lesson' : 'Back to Dashboard'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
