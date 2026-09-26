import { NextResponse } from 'next/server';
import { workoutErrorCode } from '@mucho-loco/customer-core/workouts';
import { performanceRepository } from '@/lib/repositories/performance.repository';
import { getCurrentUserEmail } from '@/lib/session';

// Borrar un entrenamiento propio (spec 021). El de otro socio responde el
// mismo 404 que uno que no existe.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await performanceRepository.deleteWorkout(email, id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (workoutErrorCode(e) === 'WORKOUT_NOT_FOUND') {
      return NextResponse.json({ error: 'WORKOUT_NOT_FOUND' }, { status: 404 });
    }
    throw e;
  }
}
