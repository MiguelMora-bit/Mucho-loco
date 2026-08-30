'use client';

import { useState } from 'react';
import Link from 'next/link';

type ViewKey = 'overview' | 'workouts' | 'heatmap';

interface Workout {
  date: string;
  name: string;
  sets: number;
  vol: string;
  pr: string | null;
  duration: string;
}

const MOCK_WORKOUTS: Workout[] = [
  { date: '18 JUN', name: 'Push Day · Pecho & Hombros', sets: 18, vol: '12,400 kg', pr: 'Press plano: 110kg', duration: '1h 24m' },
  { date: '16 JUN', name: 'Leg Day · Cuadriceps', sets: 22, vol: '18,900 kg', pr: null, duration: '58m' },
  { date: '14 JUN', name: 'Pull Day · Espalda & Bíceps', sets: 20, vol: '14,200 kg', pr: 'Peso muerto: 155kg', duration: '2h 02m' },
  { date: '12 JUN', name: 'Push Day · Tríceps', sets: 16, vol: '9,800 kg', pr: null, duration: '1h 11m' },
  { date: '10 JUN', name: 'Full Body HIIT', sets: 24, vol: '6,500 kg', pr: null, duration: '1h 45m' },
  { date: '07 JUN', name: 'Leg Day · Isquiotibiales', sets: 20, vol: '16,200 kg', pr: 'Hip thrust: 170kg', duration: '1h 33m' },
];
const HEATMAP: string[][] = Array.from({ length: 52 }, () => Array.from({ length: 7 }, () => Math.random() > 0.4 ? (Math.random() > 0.6 ? 'l3' : Math.random() > 0.5 ? 'l2' : 'l1') : ''));

export default function RendimientoPage() {
  const [view, setView] = useState<ViewKey>('overview');

  return (
    <div className="bg-ml-black min-h-screen pb-20">
      <nav className="flex items-center px-8 py-[18px] border-b border-ml-border gap-[18px]">
        <Link href="/panel" className="flex items-center gap-3 no-underline">
          <img src="/assets/bull-head.png" className="w-11 h-11 object-contain drop-shadow-[0_0_8px_rgba(225,20,28,0.7)]" alt="" />
          <div className="font-display text-[22px] leading-none text-ml-cream">MUCHO <span className="text-ml-red">LOCO</span></div>
        </Link>
        <span className="font-mono text-[11px] text-ml-cream-dim tracking-wide-xl uppercase">
          <Link href="/panel" className="text-ml-cream-dim no-underline">Mi cuenta</Link> · Rendimiento
        </span>
        <span className="flex-1" />
        <Link href="/panel" className="font-mono text-xs text-ml-cream-dim uppercase tracking-[0.12em] px-4 py-2.5 border border-ml-border no-underline">← VOLVER</Link>
      </nav>

      <div className="max-w-[1200px] mx-auto mt-8 px-8">
        <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
          <div>
            <div className="font-mono text-[11px] text-ml-orange tracking-wide-xl uppercase mb-1.5">📈 MI RENDIMIENTO</div>
            <h1 className="font-display text-[clamp(40px,5vw,64px)] leading-[0.95]">ESTADÍSTICAS<br /><span className="text-ml-red">Y PROGRESO</span></h1>
          </div>
          <div className="flex gap-2">
            {(['overview', 'workouts', 'heatmap'] as ViewKey[]).map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-[18px] py-2.5 font-bebas tracking-wide text-sm cursor-pointer uppercase text-ml-cream border ${view === v ? 'bg-ml-red border-ml-red' : 'bg-ml-card border-ml-border'}`}>
                {v === 'overview' ? 'RESUMEN' : v === 'workouts' ? 'ENTRENAMIENTOS' : 'HEATMAP'}
              </button>
            ))}
          </div>
        </div>

        {view === 'overview' && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-7">
              {[
                { lbl: 'ENTRENAMIENTOS ESTE MES', num: '18', sub: '+3 vs mes anterior', color: 'var(--orange)' },
                { lbl: 'VOLUMEN TOTAL (KG)', num: '94K', sub: '↑ 12% vs mes anterior', color: 'var(--red)' },
                { lbl: 'RACHA ACTUAL', num: '7d', sub: 'Mejor: 14 días', color: '#ffe066' },
                { lbl: 'PRs ESTE MES', num: '3', sub: 'Press · Peso muerto · Hip thrust', color: '#6dd56d' },
              ].map((s, i) => (
                <div key={i} className="rend-stat">
                  <div className="font-mono text-[10px] text-ml-cream-dim uppercase tracking-wide-xl mb-1.5">{s.lbl}</div>
                  <div className="font-display text-5xl leading-none" style={{ color: s.color }}>{s.num}</div>
                  <div className="text-[11px] text-ml-cream-dim mt-2">{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="bg-ml-card border border-ml-border p-[22px] mb-6">
              <div className="font-display text-[22px] mb-2">ÚLTIMOS <span className="text-ml-red">RECORDS</span> PERSONALES</div>
              <div className="grid grid-cols-3 gap-[14px]">
                {[
                  { exercise: 'PRESS DE BANCA', weight: '110 KG', date: '18 JUN', delta: '+5kg' },
                  { exercise: 'PESO MUERTO', weight: '155 KG', date: '14 JUN', delta: '+10kg' },
                  { exercise: 'HIP THRUST', weight: '170 KG', date: '07 JUN', delta: '+5kg' },
                ].map((pr, i) => (
                  <div key={i} className="bg-ml-card-2 p-4 border-l-[3px] border-ml-red">
                    <div className="font-mono text-[10px] text-ml-orange tracking-wide-xl mb-1">🏆 PR</div>
                    <div className="font-bebas text-sm tracking-[0.06em] text-ml-cream-dim mb-1">{pr.exercise}</div>
                    <div className="font-display text-[36px] leading-none text-ml-red">{pr.weight}</div>
                    <div className="flex gap-2 mt-2">
                      <span className="font-mono text-[10px] text-ml-cream-dim">{pr.date}</span>
                      <span className="font-mono text-[10px] text-[#6dd56d]">{pr.delta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {view === 'workouts' && (
          <div className="bg-ml-card border border-ml-border p-[22px]">
            <div className="font-display text-[22px] mb-[18px]">HISTORIAL DE <span className="text-ml-red">ENTRENAMIENTOS</span></div>
            {MOCK_WORKOUTS.map((w, i) => (
              <div key={i} className="workout-row">
                <div>
                  <b className="font-display text-[22px] text-ml-red leading-none">{w.date.split(' ')[0]}</b>
                  <div className="font-mono text-[9px] text-ml-cream-dim tracking-wide">{w.date.split(' ')[1]}</div>
                </div>
                <div>
                  <b className="text-sm">{w.name}</b>
                  <div className="flex gap-3 mt-1.5 flex-wrap">
                    <span className="font-mono text-[11px] text-ml-cream-dim">{w.sets} series</span>
                    <span className="font-mono text-[11px] text-ml-cream-dim">{w.vol} vol</span>
                    {w.pr && <span className="font-mono text-[11px] text-[#6dd56d]">🏆 {w.pr}</span>}
                  </div>
                </div>
                <div className="font-mono text-[13px] text-ml-orange">{w.duration}</div>
              </div>
            ))}
          </div>
        )}

        {view === 'heatmap' && (
          <div className="bg-ml-card border border-ml-border p-[22px]">
            <div className="font-display text-[22px] mb-1.5">HEATMAP DE <span className="text-ml-red">ASISTENCIA</span></div>
            <p className="text-ml-cream-dim text-[13px] mb-5">Últimas 52 semanas · Cada columna = 1 semana</p>
            <div className="overflow-x-auto pb-3">
              <div className="heatmap-grid min-w-[700px]">
                {HEATMAP.map((week, wi) =>
                  week.map((day, di) => (
                    <div key={`${wi}-${di}`} className={'heatmap-cell' + (day ? ' ' + day : '')} title={day ? 'Entrenamiento' : 'Sin registro'} />
                  ))
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-[14px] font-mono text-[10px] text-ml-cream-dim">
              <span>Menos</span>
              <div className="w-3 h-3 bg-ml-card-2 border border-ml-border rounded-sm" />
              <div className="w-3 h-3 bg-[rgba(225,20,28,0.25)] rounded-sm" />
              <div className="w-3 h-3 bg-[rgba(225,20,28,0.55)] rounded-sm" />
              <div className="w-3 h-3 bg-ml-red rounded-sm" />
              <span>Más</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
