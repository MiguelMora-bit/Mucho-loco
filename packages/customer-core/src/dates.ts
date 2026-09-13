import type { Lang } from '@mucho-loco/types';

// timeZone: 'UTC' always wins over a caller-supplied value — these dates are
// date-only strings like '2026-06-19', which parse as UTC midnight, so
// formatting in a negative-UTC-offset zone (all of Mexico) without pinning
// UTC would print the previous day.
export function formatDate(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { ...opts, timeZone: 'UTC' }).format(new Date(iso));
}

/**
 * Duración de una visita, a partir de minutos. El backend manda el número, no
 * `'1h 24m'` — ese texto no se podía traducir ni reformatear.
 */
export function formatDuration(minutes: number, lang: Lang): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  // El padStart mantiene la columna alineada en la lista de visitas ("2h 02m").
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

/** Día del mes de una fecha ISO, con dos dígitos — la cifra grande de la lista de visitas. */
export function formatDayOfMonth(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
    day: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

/** Mes abreviado en mayúsculas, sin punto — el rótulo bajo el día. */
export function formatMonthShort(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
    month: 'short',
    timeZone: 'UTC',
  })
    .format(new Date(iso))
    .replace('.', '')
    .toUpperCase();
}
