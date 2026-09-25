import { describe, expect, it } from 'vitest';
import { workoutDay } from '../workouts';
import { PerformanceMockDatasource } from './performance.mock';

// Spec 017: el mock registra por socio con la misma regla que el backend.
describe('PerformanceMockDatasource workouts', () => {
  const ds = new PerformanceMockDatasource();

  it("lists Diego's logged workouts newest first, with records from the rule", async () => {
    const workouts = await ds.getWorkouts('diego@mucholoco.mx');
    expect(workouts[0]).toMatchObject({ name: 'Push Day · Pecho & Hombros', prs: [{ exercise: 'Press de banca', weightKg: 105 }] });
    // El primer entrenamiento es la línea base: sin récords.
    expect(workouts.at(-1)?.prs).toEqual([]);
  });

  it('logs, lists and deletes only for its own member', async () => {
    const email = `logger.${Date.now()}@test.mx`;
    const saved = await ds.logWorkout(email, {
      date: workoutDay(0),
      name: ' Push Day ',
      durationMinutes: 45,
      exercises: [{ name: 'Press de banca', sets: [{ reps: 8, weightKg: 60 }, { reps: 6, weightKg: 70 }] }],
    });
    expect(saved).toMatchObject({ name: 'Push Day', setCount: 2, volumeKg: 900, prs: [] });
    expect(await ds.getWorkouts(email)).toHaveLength(1);
    expect(await ds.getWorkouts(`otro.${email}`)).toEqual([]);

    await expect(ds.deleteWorkout(`otro.${email}`, saved.id)).rejects.toThrow('WORKOUT_NOT_FOUND');
    await ds.deleteWorkout(email, saved.id);
    expect(await ds.getWorkouts(email)).toEqual([]);
  });

  it('rejects what the backend would reject', async () => {
    await expect(
      ds.logWorkout('x@test.mx', { date: workoutDay(1), name: 'Mañana', durationMinutes: null, exercises: [{ name: 'Press', sets: [{ reps: 8, weightKg: 60 }] }] }),
    ).rejects.toThrow('WORKOUT_INVALID');
  });
});
