import { Injectable } from '@nestjs/common';
import type {
  HeatmapLevel,
  LocalizedString,
  PerformanceStat,
  PersonalRecord,
  Workout,
} from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type {
  PerformanceStat as StatRow,
  PersonalRecord as RecordRow,
  Workout as WorkoutRow,
  HeatmapCell as HeatmapCellRow,
} from '@prisma/client';

function toStat(row: StatRow): PerformanceStat {
  return {
    lbl: row.lbl as LocalizedString,
    num: row.num,
    sub: row.sub as LocalizedString,
    color: row.color,
  };
}

function toRecord(row: RecordRow): PersonalRecord {
  return {
    exercise: row.exercise as LocalizedString,
    weight: row.weight,
    date: row.date.toISOString().slice(0, 10),
    delta: row.delta,
  };
}

function toWorkout(row: WorkoutRow): Workout {
  return {
    date: row.date.toISOString().slice(0, 10),
    name: row.name as LocalizedString,
    sets: row.sets,
    vol: row.vol,
    pr: (row.pr as LocalizedString | null) ?? null,
    duration: row.duration,
  };
}

// '' del contrato de HeatmapLevel no es un valor de enum válido en Postgres
// (ver comentario en schema.prisma) — 'none' se traduce de vuelta aquí para
// no filtrar ese detalle de almacenamiento al frontend.
function toHeatmapLevel(row: HeatmapCellRow): HeatmapLevel {
  return row.level === 'none' ? '' : row.level;
}

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  async getStats(): Promise<PerformanceStat[]> {
    const rows = await this.prisma.performanceStat.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(toStat);
  }

  async getPersonalRecords(): Promise<PersonalRecord[]> {
    const rows = await this.prisma.personalRecord.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(toRecord);
  }

  async getWorkouts(): Promise<Workout[]> {
    const rows = await this.prisma.workout.findMany({
      orderBy: { date: 'desc' },
    });
    return rows.map(toWorkout);
  }

  async getHeatmap(): Promise<HeatmapLevel[][]> {
    const rows = await this.prisma.heatmapCell.findMany({
      orderBy: [{ week: 'asc' }, { day: 'asc' }],
    });
    const weeks: HeatmapLevel[][] = Array.from({ length: 52 }, () => []);
    for (const row of rows) {
      weeks[row.week][row.day] = toHeatmapLevel(row);
    }
    return weeks;
  }
}
