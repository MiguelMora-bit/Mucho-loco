import type { Lang, NewWorkout, Workout, WorkoutRecord } from '@mucho-loco/types';

/**
 * Entrenamientos del socio (spec 017): la validación de forma que comparten
 * los clientes y el DTO del backend, y los derivados (series, volumen,
 * récords) que calcula el servidor — aquí para el mock, con la misma regla
 * que `workout-progress.ts` del backend (que no depende de este paquete).
 */
export const WORKOUT_LIMITS = {
  name: 60,
  exercises: 20,
  sets: 20,
  reps: 100,
  weightKg: 500,
  durationMinutes: 600,
} as const;

export type WorkoutProblem = 'DATE' | 'NAME' | 'DURATION' | 'EXERCISES' | 'EXERCISE_NAME' | 'SETS' | 'REPS' | 'WEIGHT';

const MEXICO_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' });
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` de hoy (0) o ayer (-1) en Ciudad de México. */
export function workoutDay(offsetDays: number, now: Date = new Date()): string {
  const date = new Date(`${MEXICO_DAY.format(now)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function validDay(day: string): boolean {
  return ISO_DAY.test(day) && new Date(`${day}T00:00:00.000Z`).toISOString().startsWith(day);
}

const within = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;
const named = (text: string) => text.trim().length > 0 && text.trim().length <= WORKOUT_LIMITS.name;

/** Qué le falta al entrenamiento, o `null` si se puede guardar. El día no puede ser futuro (CDMX). */
export function workoutProblem(input: NewWorkout, now: Date = new Date()): WorkoutProblem | null {
  if (!validDay(input.date) || input.date > workoutDay(0, now)) return 'DATE';
  if (!named(input.name)) return 'NAME';
  if (input.durationMinutes !== null && !(Number.isInteger(input.durationMinutes) && within(input.durationMinutes, 1, WORKOUT_LIMITS.durationMinutes))) {
    return 'DURATION';
  }
  if (input.exercises.length < 1 || input.exercises.length > WORKOUT_LIMITS.exercises) return 'EXERCISES';
  for (const exercise of input.exercises) {
    if (!named(exercise.name)) return 'EXERCISE_NAME';
    if (exercise.sets.length < 1 || exercise.sets.length > WORKOUT_LIMITS.sets) return 'SETS';
    for (const set of exercise.sets) {
      if (!(Number.isInteger(set.reps) && within(set.reps, 1, WORKOUT_LIMITS.reps))) return 'REPS';
      if (!within(set.weightKg, 0, WORKOUT_LIMITS.weightKg)) return 'WEIGHT';
    }
  }
  return null;
}

/** El mismo ejercicio para los récords: sin mayúsculas, acentos ni espacios de más. */
export function exerciseKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Derivados de cada entrenamiento, en orden cronológico (el más viejo
 * primero, que es como se decide un récord). Un récord es superar el mejor
 * peso de TODOS los entrenamientos anteriores de ese ejercicio; la primera vez
 * es la línea base, no récord.
 */
export function withProgress<T extends NewWorkout & { id: string }>(chronological: readonly T[]): Workout[] {
  const best = new Map<string, number>();
  return chronological.map((w) => {
    // El peso más alto de cada ejercicio en ESTE entrenamiento (un ejercicio
    // repetido cuenta una vez), con el nombre como lo escribió el socio.
    const heaviest = new Map<string, WorkoutRecord>();
    for (const exercise of w.exercises) {
      const key = exerciseKey(exercise.name);
      const top = Math.max(...exercise.sets.map((s) => s.weightKg));
      const current = heaviest.get(key);
      if (!current || top > current.weightKg) heaviest.set(key, { exercise: exercise.name.trim(), weightKg: top });
    }
    const prs: WorkoutRecord[] = [];
    for (const [key, record] of heaviest) {
      const previous = best.get(key);
      if (previous !== undefined && record.weightKg > previous) prs.push(record);
      best.set(key, Math.max(previous ?? record.weightKg, record.weightKg));
    }
    const sets = w.exercises.flatMap((e) => e.sets);
    return {
      id: w.id,
      date: w.date,
      name: w.name,
      durationMinutes: w.durationMinutes,
      exercises: w.exercises,
      setCount: sets.length,
      volumeKg: round2(sets.reduce((sum, s) => sum + s.reps * s.weightKg, 0)),
      prs,
    };
  });
}

/** Kilos con separador de miles del idioma en que se pinta ("14,200"); la unidad la pone la UI. */
export function formatKg(kg: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-MX' : 'en-US', { maximumFractionDigits: 1 }).format(kg);
}
