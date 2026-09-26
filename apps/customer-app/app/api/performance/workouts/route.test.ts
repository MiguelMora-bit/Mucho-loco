import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workoutDay } from '@mucho-loco/customer-core/workouts';

const getCurrentUserEmailMock = vi.fn();
vi.mock('../../../../lib/session', () => ({ getCurrentUserEmail: () => getCurrentUserEmailMock() }));

const logWorkoutMock = vi.fn();
const deleteWorkoutMock = vi.fn();
vi.mock('../../../../lib/repositories/performance.repository', () => ({
  performanceRepository: {
    logWorkout: (...args: unknown[]) => logWorkoutMock(...args),
    deleteWorkout: (...args: unknown[]) => deleteWorkoutMock(...args),
  },
}));

const { POST } = await import('./route');
const { DELETE } = await import('./[id]/route');
const { WorkoutError } = await import('@mucho-loco/customer-core/workouts');

const WORKOUT = {
  date: workoutDay(0),
  name: 'Push Day',
  durationMinutes: 45,
  exercises: [{ name: 'Press de banca', sets: [{ reps: 8, weightKg: 60 }] }],
};

function post(body: unknown) {
  return POST(new Request('http://localhost/api/performance/workouts', { method: 'POST', body: JSON.stringify(body) }));
}
function remove(id: string) {
  return DELETE(new Request(`http://localhost/api/performance/workouts/${id}`, { method: 'DELETE' }), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  getCurrentUserEmailMock.mockReset();
  logWorkoutMock.mockReset();
  deleteWorkoutMock.mockReset();
});

describe('POST /api/performance/workouts (spec 021)', () => {
  it('answers 401 without a verified session', async () => {
    getCurrentUserEmailMock.mockResolvedValue(null);
    expect((await post(WORKOUT)).status).toBe(401);
    expect(logWorkoutMock).not.toHaveBeenCalled();
  });

  it('logs only what the member recorded, under the session email', async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');
    logWorkoutMock.mockResolvedValue({ id: 'w1', ...WORKOUT, setCount: 1, volumeKg: 480, prs: [] });

    const res = await post({ ...WORKOUT, email: 'otro@mucholoco.mx', volumeKg: 1, prs: [{ exercise: 'x', weightKg: 1 }] });

    expect(res.status).toBe(201);
    expect(logWorkoutMock).toHaveBeenCalledWith('diego@mucholoco.mx', WORKOUT);
    expect(await res.json()).toMatchObject({ id: 'w1', volumeKg: 480 });
  });

  it('answers 400 INVALID_WORKOUT with the problem, without calling the backend', async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');
    const res = await post({ ...WORKOUT, exercises: [{ name: '', sets: [{ reps: 8, weightKg: 60 }] }] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'INVALID_WORKOUT', problem: 'EXERCISE_NAME' });
    expect((await post(null)).status).toBe(400);
    expect(logWorkoutMock).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/performance/workouts/[id] (spec 021)', () => {
  it('answers 401 without a session and 204 for your own workout', async () => {
    getCurrentUserEmailMock.mockResolvedValue(null);
    expect((await remove('w1')).status).toBe(401);

    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');
    deleteWorkoutMock.mockResolvedValue(undefined);
    expect((await remove('w1')).status).toBe(204);
    expect(deleteWorkoutMock).toHaveBeenCalledWith('diego@mucholoco.mx', 'w1');
  });

  it("answers 404 for someone else's or a missing workout", async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');
    deleteWorkoutMock.mockRejectedValue(new WorkoutError('WORKOUT_NOT_FOUND'));
    const res = await remove('w-otro');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'WORKOUT_NOT_FOUND' });
  });
});
