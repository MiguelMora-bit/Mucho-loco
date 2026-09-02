import type { HeatmapLevel } from '@/lib/types/performance';
import type { Translations } from '@mucho-loco/types';

interface HeatmapProps {
  t: Translations;
  heatmap: HeatmapLevel[][];
}

export function Heatmap({ t, heatmap }: HeatmapProps) {
  return (
    <div className="bg-ml-card border border-ml-border p-5.5">
      <div className="font-display text-22 mb-1.5">{t.performance.heatmap.titlePrefix} <span className="text-ml-red">{t.performance.heatmap.titleHighlight}</span></div>
      <p className="text-ml-cream-dim text-[13px] mb-5">{t.performance.heatmap.caption}</p>
      <div className="overflow-x-auto pb-3">
        <div className="heatmap-grid min-w-[700px]">
          {heatmap.map((week, wi) =>
            week.map((day, di) => (
              <div key={`${wi}-${di}`} className={'heatmap-cell' + (day ? ' ' + day : '')} title={day ? t.performance.heatmap.trained : t.performance.heatmap.noRecord} />
            ))
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3.5 font-mono text-10 text-ml-cream-dim">
        <span>{t.performance.heatmap.less}</span>
        <div className="w-3 h-3 bg-ml-card-2 border border-ml-border rounded-sm" />
        <div className="w-3 h-3 bg-[rgba(225,20,28,0.25)] rounded-sm" />
        <div className="w-3 h-3 bg-[rgba(225,20,28,0.55)] rounded-sm" />
        <div className="w-3 h-3 bg-ml-red rounded-sm" />
        <span>{t.performance.heatmap.more}</span>
      </div>
    </div>
  );
}
