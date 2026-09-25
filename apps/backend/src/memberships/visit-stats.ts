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

function previousDay(day: string): string {
  const date = dayDate(day);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function nextDay(day: string): string {
  const date = dayDate(day);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

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
