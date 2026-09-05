import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../types/language';

const LANG_CODES: Record<Language, string> = { spanish: 'es-ES', french: 'fr-FR', dutch: 'nl-NL' };
let playbackOwner: symbol | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = speechSynthesis.getVoices();
  if (voices.length) return Promise.resolve(voices);
  return new Promise((resolve) => {
    function done() {
      clearTimeout(timer);
      speechSynthesis.removeEventListener('voiceschanged', done);
      resolve(speechSynthesis.getVoices());
    }
    const timer = setTimeout(done, 700);
    speechSynthesis.addEventListener('voiceschanged', done);
  });
}

export function useAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owner = useRef(Symbol('speech'));
  const request = useRef(0);
  const alive = useRef(true);
  const supported = typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => {
    alive.current = true;
    const instance = owner.current;
    function invalidate() { request.current++; }
    return () => {
      alive.current = false;
      invalidate();
      if (playbackOwner === instance && typeof speechSynthesis !== 'undefined') { playbackOwner = null; speechSynthesis.cancel(); }
    };
  }, []);

  const play = useCallback(async (text: string, language: Language, speed = 1, onStarted?: () => void) => {
    setError(null);
    if (!supported) { setError('Audio is unavailable in this browser. Use the transcript or written example.'); return; }
    const current = ++request.current;
    playbackOwner = owner.current;
    speechSynthesis.cancel();
    setIsLoading(true);
    try {
      const voices = await loadVoices();
      if (!alive.current || request.current !== current || playbackOwner !== owner.current) return;
      const code = LANG_CODES[language];
      const voice = voices.find((item) => item.lang.toLowerCase() === code.toLowerCase()) ?? voices.find((item) => item.lang.toLowerCase().startsWith(code.slice(0, 2)));
      if (!voice) { setError('A voice for this language is not installed on your device. Use the transcript, or add a language voice in your device settings.'); return; }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = code;
      utterance.voice = voice;
      utterance.rate = speed;
      const isCurrent = () => alive.current && current === request.current;
      utterance.onstart = () => { if (isCurrent()) { setIsPlaying(true); onStarted?.(); } };
      utterance.onend = () => { if (isCurrent()) setIsPlaying(false); };
      utterance.onerror = (event) => {
        if (!isCurrent()) return;
        setIsPlaying(false);
        if (!['canceled', 'interrupted'].includes(event.error)) setError('Audio could not play. Try again or use the transcript.');
      };
      speechSynthesis.speak(utterance);
    } catch {
      if (alive.current && current === request.current) setError('Audio could not play. Try again or use the transcript.');
    } finally { if (alive.current && current === request.current) setIsLoading(false); }
  }, [supported]);

  const stop = useCallback(() => {
    request.current++;
    if (playbackOwner === owner.current && typeof speechSynthesis !== 'undefined') { playbackOwner = null; speechSynthesis.cancel(); }
    setIsPlaying(false);
    setIsLoading(false);
  }, []);
  return { play, stop, isPlaying, isLoading, error };
}
