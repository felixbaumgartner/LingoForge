export type Language = 'spanish' | 'french' | 'dutch';

export interface Word {
  rank: number;
  word: string;
  translation: string;
  notes?: string;
}

export const LANGUAGES: { id: Language; label: string; flag: string }[] = [
  { id: 'spanish', label: 'Spanish', flag: '🇪🇸' },
  { id: 'french', label: 'French', flag: '🇫🇷' },
  { id: 'dutch', label: 'Dutch', flag: '🇳🇱' },
];
