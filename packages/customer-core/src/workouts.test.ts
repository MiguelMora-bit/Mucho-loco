import { describe, expect, it } from 'vitest';
import type { NewWorkout } from '@mucho-loco/types';
import { ApiRequestError } from '@mucho-loco/api-client';
import { WorkoutError, exerciseKey, formatKg, latestRecords, summarize, withProgress, workoutDay, workoutErrorCode, workoutProblem } from './workouts';

// Viernes 25 de septiembre de 2026, 12:00 en CDMX.
const NOW = new Date('2026-09-25T18:00:00.000Z');

function workout(overrides: Partial<NewWorkout> = {}): NewWorkout {
  return {
    date: '2026-09-25',
    name: 'Push Day',
    durationMinutes: 45,
    exercises: [{ name: 'Press de banca', sets: [{ reps: 8, weightKg: 60 }, { reps: 6, weightKg: 70 }] }],
    ...overrides,
  };
}

describe('workoutProblem (spec 017)', () => {
  it('accepts a complete workout', () => {
    expect(workoutProblem(workout(), NOW)).toBeNull();
    expect(workoutProblem(workout({ durationMinutes: null }), NOW)).toBeNull();
    // 0 kg = peso corporal.
    expect(workoutProblem(workout({ exercises: [{ name: 'Dominadas', sets: [{ reps: 10, weightKg: 0 }] }] }), NOW)).toBeNull();
  });

  it('names what is wrong', () => {
    expect(workoutProblem(workout({ name: '  ' }), NOW)).toBe('NAME');
    expect(workoutProblem(workout({ date: '2026-09-26' }), NOW)).toBe('DATE');
    expect(workoutProblem(workout({ date: '25/09/2026' }), NOW)).toBe('DATE');
    expect(workoutProblem(workout({ durationMinutes: 0 }), NOW)).toBe('DURATION');
    expect(workoutProblem(workout({ exercises: [] }), NOW)).toBe('EXERCISES');
    expect(workoutProblem(workout({ exercises: [{ name: '', sets: [{ reps: 8, weightKg: 60 }] }] }), NOW)).toBe('EXERCISE_NAME');
    expect(workoutProblem(workout({ exercises: [{ name: 'Press', sets: [] }] }), NOW)).toBe('SETS');
    expect(workoutProblem(workout({ exercises: [{ name: 'Press', sets: [{ reps: 0, weightKg: 60 }] }] }), NOW)).toBe('REPS');
    expect(workoutProblem(workout({ exercises: [{ name: 'Press', sets: [{ reps: 8, weightKg: 501 }] }] }), NOW)).toBe('WEIGHT');
    expect(workoutProblem(workout({ exercises: [{ name: 'Press', sets: [{ reps: 8, weightKg: Number.NaN }] }] }), NOW)).toBe('WEIGHT');
  });
});

describe('exerciseKey', () => {
  it('ignores case, accents and extra spaces', () => {
    expect(exerciseKey('  Extensión de  Tríceps ')).toBe(exerciseKey('extension de triceps'));
  });
});

describe('withProgress (spec 017)', () => {
  it('derives sets and volume', () => {
    const [w] = withProgress([{ id: 'w1', ...workout() }]);
    expect(w).toMatchObject({ id: 'w1', setCount: 2, volumeKg: 900, prs: [] });
  });

  // La primera vez es la línea base; supera el mejor anterior → récord.
  it('marks a record only when the best previous weight is beaten', () => {
    const lift = (id: string, date: string, name: string, weightKg: number) => ({
      id,
      ...workout({ date, exercises: [{ name, sets: [{ reps: 5, weightKg }] }] }),
    });
    const result = withProgress([
      lift('a', '2026-09-21', 'Press de banca', 70),
      lift('b', '2026-09-22', 'press de banca ', 70),
      lift('c', '2026-09-23', 'Press de Banca', 75),
      lift('d', '2026-09-24', 'Sentadilla', 100),
    ]);
    expect(result.map((w) => w.prs)).toEqual([[], [], [{ exercise: 'Press de Banca', weightKg: 75, previousKg: 70 }], []]);
  });

  it('counts the heaviest set of a repeated exercise once', () => {
    const [, second] = withProgress([
      { id: 'a', ...workout({ exercises: [{ name: 'Remo', sets: [{ reps: 8, weightKg: 50 }] }] }) },
      {
        id: 'b',
        ...workout({
          exercises: [
            { name: 'Remo', sets: [{ reps: 8, weightKg: 55 }] },
            { name: 'remo', sets: [{ reps: 6, weightKg: 60 }] },
          ],
        }),
      },
    ]);
    expect(second.prs).toEqual([{ exercise: 'remo', weightKg: 60, previousKg: 50 }]);
  });
});

describe('formatKg and workoutDay', () => {
  it('formats kilos in the painting language', () => {
    expect(formatKg(14200, 'es')).toBe('14,200');
    expect(formatKg(22.5, 'en')).toBe('22.5');
  });

  it('gives today and yesterday in Mexico City', () => {
    expect(workoutDay(0, new Date('2026-09-26T05:30:00.000Z'))).toBe('2026-09-25');
    expect(workoutDay(-1, NOW)).toBe('2026-09-24');
  });
});

describe('summarize and latestRecords (spec 018)', () => {
  const lift = (id: string, date: string, weightKg: number, name = 'Press de banca') => ({
    id,
    ...workout({ date, exercises: [{ name, sets: [{ reps: 10, weightKg }] }] }),
  });
  // Agosto: 1 entrenamiento (línea base). Septiembre: 2, el segundo con récord.
  const workouts = withProgress([
    lift('a', '2026-08-20', 500),
    lift('b', '2026-09-02', 300, 'Sentadilla'),
    lift('c', '2026-09-20', 510),
  ]);

  it('counts this month against the last one, with volume and records', () => {
    expect(summarize(workouts, NOW)).toEqual({
      workoutsThisMonth: 2,
      workoutsLastMonth: 1,
      volumeThisMonthKg: 8100,
      volumeLastMonthKg: 5000,
      prsThisMonth: 1,
      prExercisesThisMonth: ['Press de banca'],
    });
  });

  it('goes back to December in January', () => {
    const january = withProgress([lift('a', '2025-12-31', 50), lift('b', '2026-01-02', 60)]);
    expect(summarize(january, new Date('2026-01-10T18:00:00.000Z'))).toMatchObject({ workoutsThisMonth: 1, workoutsLastMonth: 1, prsThisMonth: 1 });
  });

  it('lists the latest records first, with the weight they beat', () => {
    expect(latestRecords(workouts)).toEqual([{ exercise: 'Press de banca', weightKg: 510, date: '2026-09-20', previousKg: 500 }]);
    expect(latestRecords(withProgress([]))).toEqual([]);
  });
});

describe('workoutErrorCode (spec 021)', () => {
  it('reads the same code from the mock and from the backend', () => {
    expect(workoutErrorCode(new WorkoutError('WORKOUT_NOT_FOUND'))).toBe('WORKOUT_NOT_FOUND');
    expect(workoutErrorCode(new ApiRequestError(404, '/x', 'x', { code: 'WORKOUT_NOT_FOUND' }))).toBe('WORKOUT_NOT_FOUND');
    expect(workoutErrorCode(new ApiRequestError(400, '/x', 'x', { code: 'VALIDATION' }))).toBe('WORKOUT_INVALID');
    expect(workoutErrorCode(new ApiRequestError(500, '/x', 'x', {}))).toBeNull();
    expect(workoutErrorCode(new Error('red'))).toBeNull();
  });
});
