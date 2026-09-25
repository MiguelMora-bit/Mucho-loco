import type { HeatmapLevel, Visit } from '@mucho-loco/types';

/**
 * La asistencia del socio en 52 semanas × 7 días (lunes → domingo), con la
 * semana en curso como última columna y los días que no llegan vacíos
 * (spec 016). Gemela de `heatmapOf` del backend (que no depende de este
 * paquete): la usa el mock, así el heatmap de prueba sale del historial de
 * visitas con la misma regla en vez de inventarse.
 *
 * Los días son de Ciudad de México: una entrada a las 23:30 locales ya es
 * "mañana" en UTC.
 */
export const HEATMAP_WEEKS = 52;

const MEXICO_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' });

function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Sin salida registrada (lo normal: sucursal solo registra la entrada) → `l2`. */
function levelOf(minutes: number | null): HeatmapLevel {
  if (minutes === null) return 'l2';
  if (minutes < 45) return 'l1';
  return minutes <= 90 ? 'l2' : 'l3';
}

export function heatmapFromVisits(visits: readonly Pick<Visit, 'visitedAt' | 'durationMinutes'>[], now: Date = new Date()): HeatmapLevel[][] {
  const today = MEXICO_DAY.format(now);
  const sinceMonday = (new Date(`${today}T00:00:00.000Z`).getUTCDay() + 6) % 7;
  const start = shiftDay(today, -sinceMonday - (HEATMAP_WEEKS - 1) * 7);
  const byDay = new Map(visits.map((v) => [MEXICO_DAY.format(new Date(v.visitedAt)), levelOf(v.durationMinutes)]));
  return Array.from({ length: HEATMAP_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday): HeatmapLevel => {
      const day = shiftDay(start, week * 7 + weekday);
      return day > today ? '' : (byDay.get(day) ?? '');
    }),
  );
}
