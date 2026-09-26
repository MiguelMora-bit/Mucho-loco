import type { HeatmapLevel, NewWorkout, PerformanceSummary, PersonalRecord, Workout } from '@mucho-loco/types';
import { WorkoutError, latestRecords, summarize, withProgress, workoutProblem } from '../workouts';
import { heatmapFromVisits } from '../heatmap';
import { UserMockDatasource } from './user.mock';
import { delay } from './delay';
import type { IPerformanceRepository } from '../contract';



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
  /**
   * Mismas cifras que el backend (spec 018). La racha es la de la membresía del
   * mock — en el backend ambas salen de las mismas visitas, así el panel y
   * Rendimiento no se contradicen.
   */
  async getSummary(email: string): Promise<PerformanceSummary> {
    await delay(140);
    const membership = await new UserMockDatasource().getMembership(email);
    const streak = membership?.streak ?? 0;
    return {
      ...summarize(withProgress(WORKOUTS[email] ?? [])),
      streak,
      bestStreak: Math.max(streak, membership?.bestStreak ?? 0),
    };
  }

  async getPersonalRecords(email: string): Promise<PersonalRecord[]> {
    await delay(120);
    return latestRecords(withProgress(WORKOUTS[email] ?? []));
  }

  async getWorkouts(email: string): Promise<Workout[]> {
    await delay(160);
    return withProgress(WORKOUTS[email] ?? []).reverse();
  }

  /** Misma validación y misma regla de récords que el backend (spec 017). */
  async logWorkout(email: string, input: NewWorkout): Promise<Workout> {
    await delay(200);
    if (workoutProblem(input)) throw new WorkoutError('WORKOUT_INVALID');
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
    if (at === -1) throw new WorkoutError('WORKOUT_NOT_FOUND');
    list.splice(at, 1);
  }

  /** Del historial de visitas del mock, con la misma regla que el backend (spec 016). */
  async getHeatmap(email: string): Promise<HeatmapLevel[][]> {
    return heatmapFromVisits(await new UserMockDatasource().getVisitHistory(email));
  }
}
