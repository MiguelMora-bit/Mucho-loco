import { NextResponse } from 'next/server';
import type { NewWorkout } from '@mucho-loco/types';
import { workoutErrorCode, workoutProblem } from '@mucho-loco/customer-core/workouts';
import { performanceRepository } from '@/lib/repositories/performance.repository';
import { getCurrentUserEmail } from '@/lib/session';

const text = (v: unknown) => (typeof v === 'string' ? v : '');
// Un número que no llega como número no pasa la validación (NaN), en vez de adivinarse.
const num = (v: unknown) => (typeof v === 'number' ? v : Number.NaN);

/**
 * Solo lo que el socio registró (spec 021): series, volumen y récords los
 * calcula quien implementa el contrato. Cualquier otro campo del navegador se ignora.
 */
function toNewWorkout(raw: unknown): NewWorkout {
  const body = (raw ?? {}) as Record<string, unknown>;
  const exercises = Array.isArray(body.exercises) ? (body.exercises as Record<string, unknown>[]) : [];
  return {
    date: text(body.date),
    name: text(body.name),
    durationMinutes: body.durationMinutes === null || body.durationMinutes === undefined ? null : num(body.durationMinutes),
    exercises: exercises.map((e) => ({
      name: text(e?.name),
      sets: (Array.isArray(e?.sets) ? (e.sets as Record<string, unknown>[]) : []).map((s) => ({
        reps: num(s?.reps),
        weightKg: num(s?.weightKg),
      })),
    })),
  };
}

// Registrar un entrenamiento desde la web (spec 021). Aquí y no en el
// navegador: la cookie de sesión solo se lee en el servidor. El middleware no
// cubre /api/*: esta ruta valida sesión sola.
export async function POST(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const input = toNewWorkout(await request.json().catch(() => null));
  // La misma validación que el formulario: un navegador que se la salte
  // recibe el mismo 400, no uno del backend.
  const problem = workoutProblem(input);
  if (problem) {
    return NextResponse.json({ error: 'INVALID_WORKOUT', problem }, { status: 400 });
  }

  try {
    return NextResponse.json(await performanceRepository.logWorkout(email, input), { status: 201 });
  } catch (e) {
    if (workoutErrorCode(e) === 'WORKOUT_INVALID') {
      return NextResponse.json({ error: 'INVALID_WORKOUT' }, { status: 400 });
    }
    throw e;
  }
}
