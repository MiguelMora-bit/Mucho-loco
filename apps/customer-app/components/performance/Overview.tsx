import { formatDate } from '@/lib/dates';
import type { PerformanceSummary, PersonalRecord } from '@/lib/types/performance';
import type { Lang, Translations } from '@mucho-loco/types';
import { performanceCards } from '@mucho-loco/customer-core/performance-cards';
import { formatKg } from '@mucho-loco/customer-core/workouts';

interface OverviewProps {
  t: Translations;
  lang: Lang;
  summary: PerformanceSummary;
  records: PersonalRecord[];
}

/**
 * Rendimiento → Resumen (spec 018): las tarjetas salen de los números del
 * socio (`performanceCards`, el mismo helper que el móvil) y los récords son
 * los últimos que marcó la regla del spec 017.
 */
export function Overview({ t, lang, summary, records }: OverviewProps) {
  const copy = t.performance.overview;
  const kg = t.performance.workouts.kgUnit;
  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-7">
        {performanceCards(t, lang, summary).map((card) => (
          <div key={card.label} className="rend-stat">
            <div className="font-mono text-10 text-ml-cream-dim uppercase tracking-wide-xl mb-1.5">{card.label}</div>
            <div className="font-display text-5xl leading-none" style={{ color: `var(--${card.color})` }}>{card.value}</div>
            <div className="text-11 text-ml-cream-dim mt-2">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-ml-card border border-ml-border p-5.5 mb-6">
        <div className="font-display text-22 mb-2">{copy.recordsPrefix} <span className="text-ml-red">{copy.recordsHighlight}</span> {copy.recordsSuffix}</div>
        {records.length === 0 && <p className="text-sm text-ml-cream-dim">{copy.noRecords}</p>}
        <div className="grid grid-cols-3 gap-3.5">
          {records.map((pr) => (
            <div key={`${pr.exercise}-${pr.date}`} className="bg-ml-card-2 p-4 border-l-[3px] border-ml-red">
              <div className="font-mono text-10 text-ml-orange tracking-wide-xl mb-1">🏆 PR</div>
              <div className="font-bebas text-sm tracking-[0.06em] text-ml-cream-dim mb-1 uppercase">{pr.exercise}</div>
              <div className="font-display text-[36px] leading-none text-ml-red">{formatKg(pr.weightKg, lang)} {kg.toUpperCase()}</div>
              <div className="flex gap-2 mt-2">
                <span className="font-mono text-10 text-ml-cream-dim">{formatDate(pr.date, lang, { day: '2-digit', month: 'short' })}</span>
                <span className="font-mono text-10 text-ml-green">+{formatKg(pr.weightKg - pr.previousKg, lang)} {kg}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
