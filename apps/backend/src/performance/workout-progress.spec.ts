import type { NewWorkout } from '@mucho-loco/types';
import { exerciseKey, latestRecords, summarize, withProgress } from './workout-progress';

function workout(overrides: Partial<NewWorkout> = {}): NewWorkout {
  return {
    date: '2026-09-25',
    name: 'Push Day',
    durationMinutes: 45,
    exercises: [{ name: 'Press de banca', sets: [{ reps: 8, weightKg: 60 }, { reps: 6, weightKg: 70 }] }],
    ...overrides,
  };
}

describe('exerciseKey (spec 017)', () => {
  it('ignores case, accents and extra spaces', () => {
    expect(exerciseKey('  Extensión de  Tríceps ')).toBe(exerciseKey('extension de triceps'));
  });
});

describe('withProgress (spec 017)', () => {
  it('derives sets and volume', () => {
    const [w] = withProgress([{ id: 'w1', ...workout() }]);
    expect(w).toMatchObject({ id: 'w1', setCount: 2, volumeKg: 900, prs: [] });
  });

  // La primera vez es la línea base; superar el mejor anterior es récord.
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

describe('summarize and latestRecords (spec 018)', () => {
  // Viernes 25 de septiembre de 2026, 12:00 en CDMX.
  const NOW = new Date('2026-09-25T18:00:00.000Z');
  const lift = (id: string, date: string, weightKg: number, name = 'Press de banca') => ({
    id,
    ...workout({ date, exercises: [{ name, sets: [{ reps: 10, weightKg }] }] }),
  });
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
    expect(summarize(january, new Date('2026-01-10T18:00:00.000Z'))).toMatchObject({
      workoutsThisMonth: 1,
      workoutsLastMonth: 1,
      prsThisMonth: 1,
    });
  });

  it('lists the latest records first, with the weight they beat', () => {
    expect(latestRecords(workouts)).toEqual([
      { exercise: 'Press de banca', weightKg: 510, date: '2026-09-20', previousKg: 500 },
    ]);
  });
});
