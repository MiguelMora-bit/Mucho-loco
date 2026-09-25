import type { HeatmapLevel } from '@mucho-loco/types';

/**
 * Visitas y racha del socio, derivadas de sus entradas reales (spec 012) — se
 * calculan al leer, igual que `daysLeft`, nunca se guardan.
 *
 * Todo se cuenta en días de Ciudad de México: una entrada a las 23:30 locales
 * ya es "mañana" en UTC, y contarla ahí rompería la racha del socio.
 */

const MEXICO_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Mexico_City',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `YYYY-MM-DD` del instante en hora de CDMX. */
export function mexicoDay(at: Date): string {
  return MEXICO_DAY.format(at);
}

/** El día como lo guarda una columna `DATE` (medianoche UTC). */
export function dayDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function shiftDay(day: string, days: number): string {
  const date = dayDate(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const previousDay = (day: string) => shiftDay(day, -1);
const nextDay = (day: string) => shiftDay(day, 1);

/** `YYYY-MM` del mes en curso en CDMX. */
function currentMonth(now: Date): string {
  return mexicoDay(now).slice(0, 7);
}

/** `YYYY-MM` del mes anterior (enero → diciembre del año anterior). */
function previousMonth(month: string): string {
  const [year, index] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, index - 2, 1));
  return date.toISOString().slice(0, 7);
}

function visitsInMonth(days: readonly string[], month: string): number {
  return new Set(days.filter((day) => day.startsWith(month))).size;
}

/** Días con entrada en el mes en curso (una visita por día, ver `visits_userId_visitDay_key`). */
export function visitsThisMonth(days: readonly string[], now: Date): number {
  return visitsInMonth(days, currentMonth(now));
}

/** Días con entrada el mes anterior — para "+N vs mes anterior" (spec 013). */
export function visitsLastMonth(days: readonly string[], now: Date): number {
  return visitsInMonth(days, previousMonth(currentMonth(now)));
}

/** Sucursales distintas con entrada este mes (spec 013). */
export function branchesThisMonth(
  visits: readonly { day: string; branchId: number }[],
  now: Date,
): number {
  const month = currentMonth(now);
  return new Set(visits.filter((v) => v.day.startsWith(month)).map((v) => v.branchId)).size;
}

/**
 * Días consecutivos con entrada que terminan hoy o ayer: la racha no se
 * rompe antes de que el socio tenga oportunidad de venir hoy.
 */
export function currentStreak(days: readonly string[], now: Date): number {
  const visited = new Set(days);
  let day = mexicoDay(now);
  if (!visited.has(day)) day = previousDay(day);
  let streak = 0;
  while (visited.has(day)) {
    streak++;
    day = previousDay(day);
  }
  return streak;
}

/** La racha más larga entre los días dados, en cualquier momento (spec 013). */
export function longestStreak(days: readonly string[]): number {
  const visited = new Set(days);
  let longest = 0;
  for (const day of visited) {
    // Solo se cuenta desde el primer día de cada racha.
    if (visited.has(previousDay(day))) continue;
    let length = 1;
    let next = nextDay(day);
    while (visited.has(next)) {
      length++;
      next = nextDay(next);
    }
    longest = Math.max(longest, length);
  }
  return longest;
}

export const HEATMAP_WEEKS = 52;

/** Una visita para el heatmap: su día de CDMX y cuánto duró, si se sabe. */
export interface HeatmapVisit {
  day: string;
  minutes: number | null;
}

/** Sin salida registrada (lo normal: sucursal solo registra la entrada) → `l2`. */
function levelOf(minutes: number | null): HeatmapLevel {
  if (minutes === null) return 'l2';
  if (minutes < 45) return 'l1';
  return minutes <= 90 ? 'l2' : 'l3';
}

/** El lunes con que arranca la cuadrícula: 51 semanas antes del lunes de esta. */
export function heatmapStart(now: Date): string {
  const today = mexicoDay(now);
  const sinceMonday = (dayDate(today).getUTCDay() + 6) % 7;
  return shiftDay(today, -sinceMonday - (HEATMAP_WEEKS - 1) * 7);
}

/**
 * La asistencia del socio en 52 semanas × 7 días (lunes → domingo), la última
 * columna es la semana en curso y los días que no llegan van vacíos (spec 016).
 * Gemela de `heatmapFromVisits` de customer-core — el backend no depende de
 * ese paquete.
 */
export function heatmapOf(visits: readonly HeatmapVisit[], now: Date): HeatmapLevel[][] {
  const today = mexicoDay(now);
  const start = heatmapStart(now);
  const byDay = new Map(visits.map((v) => [v.day, levelOf(v.minutes)]));
  return Array.from({ length: HEATMAP_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday): HeatmapLevel => {
      const day = shiftDay(start, week * 7 + weekday);
      return day > today ? '' : (byDay.get(day) ?? '');
    }),
  );
}
