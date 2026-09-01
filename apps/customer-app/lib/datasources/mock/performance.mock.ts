import type { Workout, PerformanceStat, PersonalRecord, HeatmapLevel } from '../../types/performance';
import { delay } from './delay';

const MOCK_STATS: PerformanceStat[] = [
  { lbl: 'ENTRENAMIENTOS ESTE MES', num: '18', sub: '+3 vs mes anterior', color: 'var(--orange)' },
  { lbl: 'VOLUMEN TOTAL (KG)', num: '94K', sub: '↑ 12% vs mes anterior', color: 'var(--red)' },
  { lbl: 'RACHA ACTUAL', num: '7d', sub: 'Mejor: 14 días', color: '#ffe066' },
  { lbl: 'PRs ESTE MES', num: '3', sub: 'Press · Peso muerto · Hip thrust', color: '#6dd56d' },
];

const MOCK_RECORDS: PersonalRecord[] = [
  { exercise: 'PRESS DE BANCA', weight: '110 KG', date: '18 JUN', delta: '+5kg' },
  { exercise: 'PESO MUERTO', weight: '155 KG', date: '14 JUN', delta: '+10kg' },
  { exercise: 'HIP THRUST', weight: '170 KG', date: '07 JUN', delta: '+5kg' },
];

const MOCK_WORKOUTS: Workout[] = [
  { date: '18 JUN', name: 'Push Day · Pecho & Hombros', sets: 18, vol: '12,400 kg', pr: 'Press plano: 110kg', duration: '1h 24m' },
  { date: '16 JUN', name: 'Leg Day · Cuadriceps', sets: 22, vol: '18,900 kg', pr: null, duration: '58m' },
  { date: '14 JUN', name: 'Pull Day · Espalda & Bíceps', sets: 20, vol: '14,200 kg', pr: 'Peso muerto: 155kg', duration: '2h 02m' },
  { date: '12 JUN', name: 'Push Day · Tríceps', sets: 16, vol: '9,800 kg', pr: null, duration: '1h 11m' },
  { date: '10 JUN', name: 'Full Body HIIT', sets: 24, vol: '6,500 kg', pr: null, duration: '1h 45m' },
  { date: '07 JUN', name: 'Leg Day · Isquiotibiales', sets: 20, vol: '16,200 kg', pr: 'Hip thrust: 170kg', duration: '1h 33m' },
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

export class PerformanceMockDatasource {
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
