import type { HeatmapLevel, NewWorkout, PerformanceStat, PersonalRecord, Workout } from '@mucho-loco/types';
import { withProgress, workoutProblem } from '../workouts';
import { heatmapFromVisits } from '../heatmap';
import { UserMockDatasource } from './user.mock';
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

type Logged = NewWorkout & { id: string };

const sets = (count: number, reps: number, weightKg: number) => Array.from({ length: count }, () => ({ reps, weightKg }));

/**
 * Lo que Diego registró (spec 017), en orden cronológico: el press de banca
 * sube 60 → 95 → 105 y la sentadilla 60 → 120, así el historial muestra
 * récords reales de la regla, no escritos a mano.
 */
const DIEGO_WORKOUTS: Logged[] = [
  { id: 'w-diego-1', date: '2026-06-07', name: 'Leg Day · Isquiotibiales', durationMinutes: 93, exercises: [
    { name: 'Peso muerto rumano', sets: sets(4, 10, 80) },
    { name: 'Hip thrust', sets: sets(4, 10, 160) },
    { name: 'Curl femoral', sets: sets(3, 12, 45) },
  ] },
  { id: 'w-diego-2', date: '2026-06-10', name: 'Full Body HIIT', durationMinutes: 105, exercises: [
    { name: 'Sentadilla', sets: sets(3, 12, 60) },
    { name: 'Press de banca', sets: sets(3, 12, 60) },
    { name: 'Remo con barra', sets: sets(3, 12, 50) },
  ] },
  { id: 'w-diego-3', date: '2026-06-12', name: 'Push Day · Tríceps', durationMinutes: 71, exercises: [
    { name: 'Press de banca', sets: sets(4, 8, 95) },
    { name: 'Fondos', sets: sets(3, 12, 0) },
    { name: 'Extensión de tríceps', sets: sets(3, 12, 30) },
  ] },
  { id: 'w-diego-4', date: '2026-06-14', name: 'Pull Day · Espalda & Bíceps', durationMinutes: 122, exercises: [
    { name: 'Peso muerto', sets: sets(5, 5, 150) },
    { name: 'Dominadas', sets: sets(4, 8, 0) },
    { name: 'Curl de bíceps', sets: sets(3, 12, 20) },
  ] },
  { id: 'w-diego-5', date: '2026-06-16', name: 'Leg Day · Cuadriceps', durationMinutes: 58, exercises: [
    { name: 'Sentadilla', sets: sets(5, 5, 120) },
    { name: 'Prensa', sets: sets(4, 12, 200) },
  ] },
  { id: 'w-diego-6', date: '2026-06-18', name: 'Push Day · Pecho & Hombros', durationMinutes: 84, exercises: [
    { name: 'Press de banca', sets: sets(5, 5, 105) },
    { name: 'Press militar', sets: sets(4, 8, 50) },
    { name: 'Aperturas', sets: sets(3, 12, 16) },
  ] },
];

/** Por socio, en orden cronológico. Vive en memoria, como el resto del mock. */
const WORKOUTS: Record<string, Logged[]> = { 'diego@mucholoco.mx': DIEGO_WORKOUTS };
let sequence = 0;

export class PerformanceMockDatasource implements IPerformanceRepository {
  async getStats(): Promise<PerformanceStat[]> {
    await delay(140);
    return MOCK_STATS;
  }

  async getPersonalRecords(): Promise<PersonalRecord[]> {
    await delay(120);
    return MOCK_RECORDS;
  }

  async getWorkouts(email: string): Promise<Workout[]> {
    await delay(160);
    return withProgress(WORKOUTS[email] ?? []).reverse();
  }

  /** Misma validación y misma regla de récords que el backend (spec 017). */
  async logWorkout(email: string, input: NewWorkout): Promise<Workout> {
    await delay(200);
    if (workoutProblem(input)) throw new Error('WORKOUT_INVALID');
    const logged: Logged = {
      id: `w-${Date.now()}-${++sequence}`,
      date: input.date,
      name: input.name.trim(),
      durationMinutes: input.durationMinutes,
      exercises: input.exercises.map((e) => ({ name: e.name.trim(), sets: e.sets.map((s) => ({ ...s })) })),
    };
    const list = (WORKOUTS[email] ??= []);
    // Después de los del mismo día: el orden de registro decide entre ellos.
    const at = list.findIndex((w) => w.date > logged.date);
    list.splice(at === -1 ? list.length : at, 0, logged);
    return withProgress(list).find((w) => w.id === logged.id)!;
  }

  async deleteWorkout(email: string, workoutId: string): Promise<void> {
    await delay(150);
    const list = WORKOUTS[email] ?? [];
    const at = list.findIndex((w) => w.id === workoutId);
    if (at === -1) throw new Error('WORKOUT_NOT_FOUND');
    list.splice(at, 1);
  }

  /** Del historial de visitas del mock, con la misma regla que el backend (spec 016). */
  async getHeatmap(email: string): Promise<HeatmapLevel[][]> {
    return heatmapFromVisits(await new UserMockDatasource().getVisitHistory(email));
  }
}
