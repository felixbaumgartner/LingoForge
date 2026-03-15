import { useRef, useCallback, useState } from 'react';
import { synthesizeSpeech } from '../api/client';
import type { Language } from '../types/language';

const audioCache = new Map<string, string>();

const LANG_CODES: Record<Language, string> = {
  spanish: 'es-ES',
  french: 'fr-FR',
  dutch: 'nl-NL',
};

function playWithWebSpeech(text: string, language: Language, speed: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_CODES[language];
    utterance.rate = speed;
    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    // Try to find a matching voice
    const voices = speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.startsWith(LANG_CODES[language].split('-')[0]));
    if (match) utterance.voice = match;

    speechSynthesis.speak(utterance);
  });
}

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const play = useCallback(async (text: string, language: Language, speed: number = 1.0) => {
    const cacheKey = `${language}-${speed}-${text}`;

    try {
      setIsLoading(true);

      // Try Minimax TTS first, fall back to Web Speech API
      let blobUrl = audioCache.get(cacheKey);
      let useFallback = false;

      if (!blobUrl) {
        try {
          const blob = await synthesizeSpeech(text, language, speed);
          // Check if the response is actually audio (not an error JSON)
          if (blob.type.includes('audio')) {
            blobUrl = URL.createObjectURL(blob);
            audioCache.set(cacheKey, blobUrl);
          } else {
            useFallback = true;
          }
        } catch {
          useFallback = true;
        }
      }

      setIsLoading(false);

      if (useFallback || !blobUrl) {
        // Use browser's built-in speech synthesis
        setIsPlaying(true);
        speechSynthesis.cancel();
        await playWithWebSpeech(text, language, speed);
        setIsPlaying(false);
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
      };

      await audio.play();
    } catch (err) {
      console.error('Audio playback error:', err);
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  return { play, stop, isPlaying, isLoading };
}
