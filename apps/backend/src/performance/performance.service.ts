import { Injectable } from '@nestjs/common';
import type {
  HeatmapLevel,
  LocalizedString,
  PerformanceStat,
  PersonalRecord,
  StatColor,
} from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type {
  PerformanceStat as StatRow,
  PersonalRecord as RecordRow,
} from '@prisma/client';
import { HEATMAP_WEEKS, dayDate, heatmapOf, heatmapStart } from '../memberships/visit-stats';

const STAT_COLORS: readonly StatColor[] = ['red', 'orange', 'yellow', 'gold', 'green', 'cream'];
/** Los dos hex que traía el seed antes del spec 010. */
const LEGACY_HEX: Record<string, StatColor> = { '#6dd56d': 'green', '#ffe066': 'gold' };

/**
 * El color como nombre de la paleta (spec 010). Acepta lo que la base pudiera
 * tener de antes — `var(--orange)` o uno de los dos hex históricos — para que
 * una fila sin migrar no rompa ningún cliente. Desconocido → `cream`.
 */
export function statColorOf(value: string): StatColor {
  const raw = value.trim().toLowerCase();
  const name = /^var\(--([a-z-]+)\)$/.exec(raw)?.[1] ?? LEGACY_HEX[raw] ?? raw;
  return (STAT_COLORS as readonly string[]).includes(name) ? (name as StatColor) : 'cream';
}

function toStat(row: StatRow): PerformanceStat {
  return {
    lbl: row.lbl as LocalizedString,
    num: row.num,
    sub: row.sub as LocalizedString,
    color: statColorOf(row.color),
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
