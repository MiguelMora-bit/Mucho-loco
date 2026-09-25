import { Injectable } from '@nestjs/common';
import type { HeatmapLevel, PerformanceSummary, PersonalRecord } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import {
  HEATMAP_WEEKS,
  currentStreak,
  dayDate,
  heatmapOf,
  heatmapStart,
  longestStreak,
} from '../memberships/visit-stats';
import { WorkoutsService } from './workouts.service';
import { latestRecords, summarize } from './workout-progress';

/** Un año de días de asistencia: alcanza para la racha actual y la mejor. */
const STREAK_WINDOW_DAYS = 366;

/**
 * Rendimiento del socio: todo sale de lo que registró (entrenamientos,
 * spec 017) y de su asistencia (visitas, spec 012). Ya no queda nada sembrado.
 */
@Injectable()
export class PerformanceService {
  constructor(
    private prisma: PrismaService,
    private workouts: WorkoutsService,
  ) {}

  /**
   * La pestaña Resumen (spec 018), en números. La racha es de asistencia: la
   * misma que muestra el panel, no una segunda racha de "días con registro".
   */
  async getSummary(userId: string, now = new Date()): Promise<PerformanceSummary> {
    const [workouts, visits] = await Promise.all([
      this.workouts.list(userId),
      this.prisma.visit.findMany({
        where: { userId },
        select: { visitDay: true },
        orderBy: { visitDay: 'desc' },
        take: STREAK_WINDOW_DAYS,
      }),
    ]);
    const days = visits.map((v) => v.visitDay.toISOString().slice(0, 10));
    const streak = currentStreak(days, now);
    return {
      ...summarize(workouts, now),
      streak,
      bestStreak: Math.max(streak, longestStreak(days)),
    };
  }

  /** Los últimos 3 récords que marcó la regla del spec 017, con el peso que superaron. */
  async getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
    return latestRecords(await this.workouts.list(userId));
  }

  /**
   * La asistencia real del socio (spec 016): cada cuadro es un día que entró
   * a una sucursal, de las visitas que registra mostrador (spec 012).
   */
  async getHeatmap(userId: string, now = new Date()): Promise<HeatmapLevel[][]> {
    const rows = await this.prisma.visit.findMany({
      where: { userId, visitDay: { gte: dayDate(heatmapStart(now)) } },
      select: { visitDay: true, durationMinutes: true },
      take: HEATMAP_WEEKS * 7,
    });
    return heatmapOf(
      rows.map((r) => ({ day: r.visitDay.toISOString().slice(0, 10), minutes: r.durationMinutes })),
      now,
    );
  }
}
