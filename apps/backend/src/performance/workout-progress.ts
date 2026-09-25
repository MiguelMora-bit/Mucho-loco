import type { NewWorkout, Workout, WorkoutRecord } from '@mucho-loco/types';

/**
 * Derivados de los entrenamientos del socio (spec 017): series, volumen y
 * récords. Gemela de `withProgress` de `@mucho-loco/customer-core/workouts`
 * (la que usa el mock) — el backend no depende de ese paquete, igual que
 * `evaluateAccess` o `heatmapOf`.
 */

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
 * En orden cronológico (el más viejo primero, que es como se decide un
 * récord). Un récord es superar el mejor peso de TODOS los entrenamientos
 * anteriores de ese ejercicio; la primera vez es la línea base, no récord.
 */
export function withProgress<T extends NewWorkout & { id: string }>(
  chronological: readonly T[],
): Workout[] {
  const best = new Map<string, number>();
  return chronological.map((w) => {
    // El peso más alto de cada ejercicio en ESTE entrenamiento (un ejercicio
    // repetido cuenta una vez), con el nombre como lo escribió el socio.
    const heaviest = new Map<string, WorkoutRecord>();
    for (const exercise of w.exercises) {
      const key = exerciseKey(exercise.name);
      const top = Math.max(...exercise.sets.map((s) => s.weightKg));
      const current = heaviest.get(key);
      if (!current || top > current.weightKg) {
        heaviest.set(key, { exercise: exercise.name.trim(), weightKg: top });
      }
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
