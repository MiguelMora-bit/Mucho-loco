import type { Lang } from '@mucho-loco/types';

/**
 * Formatea una fecha ISO para mostrar.
 *
 * Existe porque el backend manda fechas en ISO, no texto ya armado en español
 * (`'20 JUL 2026'`), y quien la pinta decide el formato — mismo criterio que
 * ya seguían `customer-app` y `owner-panel`. Duplicado a propósito del de
 * `owner-panel/src/lib/dates.ts`: son cinco líneas de `Intl`, sin lógica de
 * negocio que se pueda desincronizar.
 *
 * `timeZone: 'UTC'` importa: una fecha sin hora (`'2026-08-01'`) se parsea
 * como medianoche UTC, y formatearla en una zona con offset negativo (todo
 * México) imprimiría el día anterior.
 */
export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

/** El idioma activo de i18next, tipado como `Lang`. */
export function langOf(language: string | undefined): Lang {
  return language?.startsWith('en') ? 'en' : 'es';
}
