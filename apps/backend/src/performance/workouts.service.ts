import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Workout } from '@mucho-loco/types';
import type { Workout as WorkoutRow, WorkoutSet as WorkoutSetRow } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { dayDate, mexicoDay } from '../memberships/visit-stats';
import { workoutNotFound } from '../common/error-codes';
import { withProgress } from './workout-progress';
import type { CreateWorkoutDto } from './dto/create-workout.dto';

type WorkoutWithSets = WorkoutRow & { sets: WorkoutSetRow[] };

/** Filas → lo que registró el socio, con los ejercicios en su orden. */
function toLogged(row: WorkoutWithSets) {
  const exercises: { name: string; sets: { reps: number; weightKg: number }[] }[] = [];
  for (const set of [...row.sets].sort((a, b) => a.exerciseOrder - b.exerciseOrder || a.setOrder - b.setOrder)) {
    exercises[set.exerciseOrder] ??= { name: set.exercise, sets: [] };
    exercises[set.exerciseOrder].sets.push({ reps: set.reps, weightKg: Number(set.weightKg) });
  }
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    name: row.name,
    durationMinutes: row.durationMinutes,
    exercises: exercises.filter(Boolean),
  };
}

/**
 * Entrenamientos del socio (spec 017). Series, volumen y récords se derivan al
 * leer — así borrar uno recalcula los récords de los demás sin más.
 */
@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  /** El más reciente primero; los récords se deciden en orden cronológico. */
  async list(userId: string): Promise<Workout[]> {
    const rows = await this.prisma.workout.findMany({
      where: { userId },
      include: { sets: true },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
    return withProgress(rows.map(toLogged)).reverse();
  }

  async log(userId: string, dto: CreateWorkoutDto, now = new Date()): Promise<Workout> {
    if (dto.date > mexicoDay(now)) {
      throw new BadRequestException({ code: 'VALIDATION', message: 'El día del entrenamiento no puede ser futuro' });
    }
    const created = await this.prisma.workout.create({
      data: {
        userId,
        date: dayDate(dto.date),
        name: dto.name.trim(),
        durationMinutes: dto.durationMinutes ?? null,
        sets: {
          create: dto.exercises.flatMap((exercise, exerciseOrder) =>
            exercise.sets.map((set, setOrder) => ({
              exerciseOrder,
              exercise: exercise.name.trim(),
              setOrder,
              reps: set.reps,
              weightKg: set.weightKg,
            })),
          ),
        },
      },
    });
    // Con su contexto: si es récord depende de los anteriores.
    const saved = (await this.list(userId)).find((w) => w.id === created.id);
    if (!saved) throw new NotFoundException(workoutNotFound(created.id));
    return saved;
  }

  /** Solo el propio: el de otro socio responde el mismo 404 que uno que no existe. */
  async remove(userId: string, workoutId: string): Promise<void> {
    const { count } = await this.prisma.workout.deleteMany({ where: { id: workoutId, userId } });
    if (count === 0) throw new NotFoundException(workoutNotFound(workoutId));
  }
}
