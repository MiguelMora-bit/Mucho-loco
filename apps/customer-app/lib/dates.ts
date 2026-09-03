import type { Lang } from '@mucho-loco/types';

// timeZone: 'UTC' always wins over a caller-supplied value — these dates are
// date-only strings like '2026-06-19', which parse as UTC midnight, so
// formatting in a negative-UTC-offset zone (all of Mexico) without pinning
// UTC would print the previous day.
export function formatDate(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { ...opts, timeZone: 'UTC' }).format(new Date(iso));
}
