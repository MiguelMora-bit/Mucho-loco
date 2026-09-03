import type { Lang } from '@mucho-loco/types';

export function formatDate(iso: string, lang: Lang): string {
  // timeZone: 'UTC' matters here — a date-only string like '2026-08-01'
  // parses as UTC midnight, so formatting it in a negative-UTC-offset zone
  // (all of Mexico) without pinning UTC would print the previous day.
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}
