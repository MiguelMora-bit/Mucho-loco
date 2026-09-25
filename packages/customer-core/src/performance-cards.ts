import type { Lang, PerformanceSummary, StatColor, Translations } from '@mucho-loco/types';

export interface PerformanceCard {
  label: string;
  value: string;
  sub: string;
  /** Nombre de la paleta (spec 010): la web lo pinta con `var(--x)`, el móvil con `colors.x`. */
  color: StatColor;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/**
 * Las cuatro tarjetas de Rendimiento → Resumen (spec 018), armadas de los
 * números de `PerformanceSummary` en el idioma de quien pinta. Antes el
 * servidor mandaba "94K" y "+3 vs mes anterior" ya escritos, en un idioma.
 */
export function performanceCards(t: Translations, lang: Lang, summary: PerformanceSummary): PerformanceCard[] {
  const copy = t.performance.overview;
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const { volumeThisMonthKg: now, volumeLastMonthKg: before } = summary;
  return [
    {
      label: copy.workoutsLabel,
      value: String(summary.workoutsThisMonth),
      sub: `${signed(summary.workoutsThisMonth - summary.workoutsLastMonth)} ${copy.vsLastMonth}`,
      color: 'orange',
    },
    {
      label: copy.volumeLabel,
      value: compact.format(now),
      // Sin volumen el mes anterior no hay porcentaje: no se divide entre cero.
      sub: before > 0 ? `${signed(Math.round(((now - before) / before) * 100))}% ${copy.vsLastMonth}` : '',
      color: 'red',
    },
    {
      label: copy.streakLabel,
      value: String(summary.streak),
      sub: `${copy.bestStreak} ${summary.bestStreak}`,
      color: 'gold',
    },
    {
      label: copy.prsLabel,
      value: String(summary.prsThisMonth),
      sub: summary.prExercisesThisMonth.join(' · ') || copy.noPrs,
      color: 'green',
    },
  ];
}
