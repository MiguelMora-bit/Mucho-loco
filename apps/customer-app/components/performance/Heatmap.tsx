import type { HeatmapLevel } from '@/lib/types/performance';

interface HeatmapProps {
  heatmap: HeatmapLevel[][];
}

export function Heatmap({ heatmap }: HeatmapProps) {
  return (
    <div className="bg-ml-card border border-ml-border p-5.5">
      <div className="font-display text-22 mb-1.5">HEATMAP DE <span className="text-ml-red">ASISTENCIA</span></div>
      <p className="text-ml-cream-dim text-[13px] mb-5">Últimas 52 semanas · Cada columna = 1 semana</p>
      <div className="overflow-x-auto pb-3">
        <div className="heatmap-grid min-w-[700px]">
          {heatmap.map((week, wi) =>
            week.map((day, di) => (
              <div key={`${wi}-${di}`} className={'heatmap-cell' + (day ? ' ' + day : '')} title={day ? 'Entrenamiento' : 'Sin registro'} />
            ))
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3.5 font-mono text-10 text-ml-cream-dim">
        <span>Menos</span>
        <div className="w-3 h-3 bg-ml-card-2 border border-ml-border rounded-sm" />
        <div className="w-3 h-3 bg-[rgba(225,20,28,0.25)] rounded-sm" />
        <div className="w-3 h-3 bg-[rgba(225,20,28,0.55)] rounded-sm" />
        <div className="w-3 h-3 bg-ml-red rounded-sm" />
        <span>Más</span>
      </div>
    </div>
  );
}
