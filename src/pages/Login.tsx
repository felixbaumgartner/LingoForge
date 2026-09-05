import { useState } from 'react';
import { BookOpen, ArrowRight, Check, Loader2, Mic, Pencil, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AudioPlayer } from '../components/AudioPlayer';
import { LANGUAGES, type Language } from '../types/language';

const SAMPLES = {
  spanish: {
    word: 'hola',
    meaning: 'Hello',
    options: ['Thank you', 'Hello', 'Goodbye'],
    example: 'Hola, Ana.',
    translation: 'Hello, Ana.',
  },
  french: {
    word: 'bonjour',
    meaning: 'Hello',
    options: ['Please', 'Goodbye', 'Hello'],
    example: 'Bonjour, Marie.',
    translation: 'Hello, Marie.',
  },
  dutch: {
    word: 'bedankt',
    meaning: 'Thank you',
    options: ['Thank you', 'Hello', 'Good night'],
    example: 'Bedankt, Sam.',
    translation: 'Thank you, Sam.',
  },
};

export function Login() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [language, setLanguage] = useState<Language>('spanish');
  const [answer, setAnswer] = useState<string | null>(null);
  const sample = SAMPLES[language];
  async function handleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (code === 'auth/popup-closed-by-user')
        setError('The sign-in window was closed. Try again when you’re ready.');
      else if (code === 'auth/popup-blocked')
        setError('Please allow the Google sign-in popup, then try again.');
      else if (code === 'auth/network-request-failed')
        setError('We couldn’t connect. Check your internet connection and try again.');
      else setError('We couldn’t sign you in. Please try again in a moment.');
    } finally {
      setSigningIn(false);
    }
  }
  return (
    <main id="main-content" className="min-h-screen overflow-hidden relative">
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/[0.035] rounded-full blur-3xl pointer-events-none"
      />
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <header className="flex items-center gap-3 py-7 sm:py-9">
          <span className="w-9 h-9 rounded-xl bg-emerald-300 flex items-center justify-center text-slate-950">
            <BookOpen className="w-5 h-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            Lingo<span className="text-emerald-300">Forge</span>
          </span>
        </header>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center pt-6 sm:pt-12 pb-14 sm:pb-20">
          <section className="relative z-10">
            <p className="eyebrow text-emerald-300 mb-6">Spanish · French · Dutch</p>
            <h1 className="font-display text-[2.8rem] sm:text-6xl font-bold tracking-tight leading-[1.08] mb-6">
              Find your words.
              <br />
              <span className="text-emerald-300">Use your voice.</span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-md mb-8">
              A little practice, every day. Learn useful words, put them into sentences, and build the
              confidence to speak.
            </p>
            {error && (
              <p
                role="alert"
                className="max-w-sm mb-4 px-4 py-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-sm text-amber-200"
              >
                {error}
              </p>
            )}
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="flex items-center justify-center gap-3 px-6 py-4 w-full sm:w-auto min-w-72 bg-white hover:bg-slate-100 disabled:opacity-70 text-slate-900 font-semibold rounded-xl transition-colors"
            >
              {signingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {signingIn ? 'Signing in…' : 'Get started with Google'}
              {!signingIn && <ArrowRight className="w-4 h-4 ml-2" />}
            </button>
            <p className="text-xs text-slate-500 mt-4">Sign in to keep your progress across devices.</p>
            <div className="space-y-4 mt-8">
              {[
                {
                  icon: Sparkles,
                  title: 'A daily session that meets you where you are',
                  text: 'Recall, write, and revisit the words you find tricky.',
                },
                {
                  icon: Pencil,
                  title: 'Understand your mistakes',
                  text: 'Clear answers, useful explanations, and another try.',
                },
                {
                  icon: Mic,
                  title: 'Read, write, and speak from day one',
                  text: 'Build each skill at your own pace.',
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/50 text-emerald-300 shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{title}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section
            aria-labelledby="preview-heading"
            className="surface-card rounded-3xl p-5 sm:p-7 shadow-2xl relative"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 id="preview-heading" className="text-xs text-slate-400 font-medium">
                TRY A WORD
              </h2>
              <span className="text-[10px] text-emerald-300 border border-emerald-300/20 bg-emerald-300/5 px-2.5 py-1 rounded-full">
                Interactive preview
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950 p-1 mb-7">
              {LANGUAGES.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={language === item.id}
                  onClick={() => {
                    setLanguage(item.id);
                    setAnswer(null);
                  }}
                  className={`py-2.5 rounded-lg text-xs font-medium ${language === item.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-slate-500 mb-3">What does this word mean?</p>
            <div className="flex items-center justify-center gap-3 mb-7">
              <p
                className="font-display font-bold text-4xl"
                lang={{ spanish: 'es', french: 'fr', dutch: 'nl' }[language]}
              >
                {sample.word}
              </p>
              <AudioPlayer text={sample.word} language={language} size="sm" />
            </div>
            <div className="space-y-2.5">
              {sample.options.map((option, index) => (
                <button
                  key={option}
                  disabled={answer !== null}
                  onClick={() => setAnswer(option)}
                  className={`w-full min-h-14 flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm text-left transition-colors ${answer !== null && option === sample.meaning ? 'border-emerald-300/50 bg-emerald-300/10 text-emerald-100' : answer === option ? 'border-amber-300/50 bg-amber-300/10 text-amber-100' : 'border-slate-700/70 bg-slate-800/30 hover:border-slate-500'}`}
                >
                  <span className="text-xs text-slate-500">0{index + 1}</span>
                  {option}
                  {answer !== null && option === sample.meaning && (
                    <Check className="w-4 h-4 ml-auto text-emerald-300" />
                  )}
                </button>
              ))}
            </div>
            <div className="min-h-24 mt-5">
              {answer !== null ? (
                <div role="status" className="text-sm">
                  <p className="text-emerald-300 font-medium mb-2">
                    {answer === sample.meaning
                      ? 'That’s it. You’ve got your first word.'
                      : `${sample.word} means “${sample.meaning.toLowerCase()}”.`}
                  </p>
                  <p className="text-slate-300">{sample.example}</p>
                  <p className="text-slate-500 text-xs mt-1">{sample.translation}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center pt-4 leading-relaxed">
                  Choose an answer. A small step is still a step.
                </p>
              )}
            </div>
            <p className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
              This preview doesn’t save progress. Sign in to start your own path.
            </p>
          </section>
        </div>
        <footer className="flex flex-wrap gap-3 justify-between border-t border-slate-800/60 py-6 text-[11px] text-slate-600">
          <span>Built for steady progress, at your pace.</span>
          <span>Daily practice · Reading · Writing · Speaking</span>
        </footer>
      </div>
    </main>
  );
}
