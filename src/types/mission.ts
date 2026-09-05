import type { Language } from './language';

export type LearningAbility = 'recognition' | 'listening' | 'recall' | 'use';
export type LearningEvidence = 'objective' | 'self-assessed';
export interface MissionPhrase {
  id: string;
  text: string;
  translation: string;
  alternatives?: string[];
  concept: string;
  explanation: string;
}
export interface MissionQuestion {
  id: string;
  phraseId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
export interface MissionChallenge {
  situation: string;
  prompt: string;
  modelAnswer: string;
  translation: string;
  checklist: string[];
}
export interface Mission {
  id: string;
  language: Language;
  goal: 'everyday' | 'social' | 'appointments';
  title: string;
  description: string;
  objective: string;
  minutes: number;
  version: number;
  phrases: MissionPhrase[];
  story: { title: string; text: string; translation: string };
  questions: MissionQuestion[];
  challenge: MissionChallenge;
  transfer: { story: { text: string; translation: string }; questions: MissionQuestion[]; challenge: MissionChallenge };
}
export interface LearningAttempt {
  id: string;
  sessionId: string;
  missionId: string;
  language: Language;
  phraseId: string;
  concept: string;
  ability: LearningAbility;
  evidence: LearningEvidence;
  correct: boolean;
  assisted: boolean;
  phase: 'practice' | 'transfer';
  createdAt: string;
}
export interface MissionCompletion {
  id: string;
  missionId: string;
  language: Language;
  phase: 'practice' | 'transfer';
  completedAt: string;
  durationSeconds: number;
}
export interface LearningJournal {
  version: 1;
  attempts: Record<string, LearningAttempt>;
  completions: Record<string, MissionCompletion>;
}
