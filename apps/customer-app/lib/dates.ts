import type { Lang } from '@mucho-loco/types';

export function formatDate(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', opts).format(new Date(iso));
}
