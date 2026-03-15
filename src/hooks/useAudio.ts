import { useCallback, useState } from 'react';
import type { Language } from '../types/language';

const LANG_CODES: Record<Language, string> = {
  spanish: 'es-ES',
  french: 'fr-FR',
  dutch: 'nl-NL',
};

// Ensure voices are loaded (some browsers load them async)
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) return Promise.resolve(voices);
  return new Promise((resolve) => {
    speechSynthesis.onvoiceschanged = () => {
      resolve(speechSynthesis.getVoices());
    };
    // Timeout fallback in case event never fires
    setTimeout(() => resolve(speechSynthesis.getVoices()), 500);
  });
}

export function useAudio() {
  const [isPlaying, setIsPlaying] = useState(false);

  const play = useCallback(async (text: string, language: Language, speed: number = 1.0) => {
    try {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const voices = await loadVoices();
      const langCode = LANG_CODES[language];

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = speed;

      // Find the best matching voice
      const exactMatch = voices.find((v) => v.lang === langCode);
      const partialMatch = voices.find((v) => v.lang.startsWith(langCode.split('-')[0]));
      if (exactMatch) utterance.voice = exactMatch;
      else if (partialMatch) utterance.voice = partialMatch;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      // Speak immediately — must be synchronous from user gesture
      speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech error:', err);
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  return { play, stop, isPlaying, isLoading: false };
}
