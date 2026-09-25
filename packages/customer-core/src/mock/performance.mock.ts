import type { Workout, PerformanceStat, PersonalRecord, HeatmapLevel } from '@mucho-loco/types';
import { delay } from './delay';
import type { IPerformanceRepository } from '../contract';

const MOCK_STATS: PerformanceStat[] = [
  { lbl: { es: 'ENTRENAMIENTOS ESTE MES', en: 'WORKOUTS THIS MONTH' }, num: '18', sub: { es: '+3 vs mes anterior', en: '+3 vs last month' }, color: 'orange' },
  { lbl: { es: 'VOLUMEN TOTAL (KG)', en: 'TOTAL VOLUME (KG)' }, num: '94K', sub: { es: '↑ 12% vs mes anterior', en: '↑ 12% vs last month' }, color: 'red' },
  { lbl: { es: 'RACHA ACTUAL', en: 'CURRENT STREAK' }, num: '7d', sub: { es: 'Mejor: 14 días', en: 'Best: 14 days' }, color: 'gold' },
  { lbl: { es: 'PRs ESTE MES', en: 'PRs THIS MONTH' }, num: '3', sub: { es: 'Press · Peso muerto · Hip thrust', en: 'Bench press · Deadlift · Hip thrust' }, color: 'green' },
];

const MOCK_RECORDS: PersonalRecord[] = [
  { exercise: { es: 'PRESS DE BANCA', en: 'BENCH PRESS' }, weight: '110 KG', date: '2026-06-18', delta: '+5kg' },
  { exercise: { es: 'PESO MUERTO', en: 'DEADLIFT' }, weight: '155 KG', date: '2026-06-14', delta: '+10kg' },
  { exercise: { es: 'HIP THRUST', en: 'HIP THRUST' }, weight: '170 KG', date: '2026-06-07', delta: '+5kg' },
];

const MOCK_WORKOUTS: Workout[] = [
  { date: '2026-06-18', name: { es: 'Push Day · Pecho & Hombros', en: 'Push Day · Chest & Shoulders' }, sets: 18, vol: '12,400 kg', pr: { es: 'Press plano: 110kg', en: 'Flat bench: 110kg' }, duration: '1h 24m' },
  { date: '2026-06-16', name: { es: 'Leg Day · Cuadriceps', en: 'Leg Day · Quads' }, sets: 22, vol: '18,900 kg', pr: null, duration: '58m' },
  { date: '2026-06-14', name: { es: 'Pull Day · Espalda & Bíceps', en: 'Pull Day · Back & Biceps' }, sets: 20, vol: '14,200 kg', pr: { es: 'Peso muerto: 155kg', en: 'Deadlift: 155kg' }, duration: '2h 02m' },
  { date: '2026-06-12', name: { es: 'Push Day · Tríceps', en: 'Push Day · Triceps' }, sets: 16, vol: '9,800 kg', pr: null, duration: '1h 11m' },
  { date: '2026-06-10', name: { es: 'Full Body HIIT', en: 'Full Body HIIT' }, sets: 24, vol: '6,500 kg', pr: null, duration: '1h 45m' },
  { date: '2026-06-07', name: { es: 'Leg Day · Isquiotibiales', en: 'Leg Day · Hamstrings' }, sets: 20, vol: '16,200 kg', pr: { es: 'Hip thrust: 170kg', en: 'Hip thrust: 170kg' }, duration: '1h 33m' },
];

function generateHeatmap(): HeatmapLevel[][] {
  return Array.from({ length: 52 }, () =>
    Array.from({ length: 7 }, (): HeatmapLevel => {
      if (Math.random() <= 0.4) return '';
      if (Math.random() > 0.6) return 'l3';
      return Math.random() > 0.5 ? 'l2' : 'l1';
    })
  );
}

export class PerformanceMockDatasource implements IPerformanceRepository {
  async getStats(): Promise<PerformanceStat[]> {
    await delay(140);
    return MOCK_STATS;
  }

  async getPersonalRecords(): Promise<PersonalRecord[]> {
    await delay(120);
    return MOCK_RECORDS;
  }

  async getWorkouts(): Promise<Workout[]> {
    await delay(160);
    return MOCK_WORKOUTS;
  }

  async getHeatmap(): Promise<HeatmapLevel[][]> {
    await delay(100);
    return generateHeatmap();
  }
}
