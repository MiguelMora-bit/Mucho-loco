import { formatDate } from '@/lib/dates';
import type { PerformanceStat, PersonalRecord } from '@/lib/types/performance';
import type { Lang, Translations } from '@mucho-loco/types';

interface OverviewProps {
  t: Translations;
  lang: Lang;
  stats: PerformanceStat[];
  records: PersonalRecord[];
}

export function Overview({ t, lang, stats, records }: OverviewProps) {
  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-7">
        {stats.map((s, i) => (
          <div key={i} className="rend-stat">
            <div className="font-mono text-10 text-ml-cream-dim uppercase tracking-wide-xl mb-1.5">{s.lbl[lang]}</div>
            <div className="font-display text-5xl leading-none" style={{ color: s.color }}>{s.num}</div>
            <div className="text-11 text-ml-cream-dim mt-2">{s.sub[lang]}</div>
          </div>
        ))}
      </div>

      <div className="bg-ml-card border border-ml-border p-5.5 mb-6">
        <div className="font-display text-22 mb-2">{t.performance.overview.recordsPrefix} <span className="text-ml-red">{t.performance.overview.recordsHighlight}</span> {t.performance.overview.recordsSuffix}</div>
        <div className="grid grid-cols-3 gap-3.5">
          {records.map((pr, i) => (
            <div key={i} className="bg-ml-card-2 p-4 border-l-[3px] border-ml-red">
              <div className="font-mono text-10 text-ml-orange tracking-wide-xl mb-1">🏆 PR</div>
              <div className="font-bebas text-sm tracking-[0.06em] text-ml-cream-dim mb-1">{pr.exercise[lang]}</div>
              <div className="font-display text-[36px] leading-none text-ml-red">{pr.weight}</div>
              <div className="flex gap-2 mt-2">
                <span className="font-mono text-10 text-ml-cream-dim">{formatDate(pr.date, lang, { day: '2-digit', month: 'short' })}</span>
                <span className="font-mono text-10 text-ml-green">{pr.delta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
