export interface Workout {
  date: string;
  name: string;
  sets: number;
  vol: string;
  pr: string | null;
  duration: string;
}

export interface PerformanceStat {
  lbl: string;
  num: string;
  sub: string;
  color: string;
}

export interface PersonalRecord {
  exercise: string;
  weight: string;
  date: string;
  delta: string;
}

export type HeatmapLevel = '' | 'l1' | 'l2' | 'l3';
