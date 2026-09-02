import type { LocalizedString } from '@mucho-loco/types';

export interface Workout {
  date: string;
  name: LocalizedString;
  sets: number;
  vol: string;
  pr: LocalizedString | null;
  duration: string;
}

export interface PerformanceStat {
  lbl: LocalizedString;
  num: string;
  sub: LocalizedString;
  color: string;
}

export interface PersonalRecord {
  exercise: LocalizedString;
  weight: string;
  date: string;
  delta: string;
}

export type HeatmapLevel = '' | 'l1' | 'l2' | 'l3';
