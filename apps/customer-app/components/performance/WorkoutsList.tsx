import type { Workout } from '@/lib/types/performance';

interface WorkoutsListProps {
  workouts: Workout[];
}

export function WorkoutsList({ workouts }: WorkoutsListProps) {
  return (
    <div className="bg-ml-card border border-ml-border p-5.5">
      <div className="font-display text-22 mb-4.5">HISTORIAL DE <span className="text-ml-red">ENTRENAMIENTOS</span></div>
      {workouts.map((w, i) => (
        <div key={i} className="workout-row">
          <div>
            <b className="font-display text-22 text-ml-red leading-none">{w.date.split(' ')[0]}</b>
            <div className="font-mono text-[9px] text-ml-cream-dim tracking-wide">{w.date.split(' ')[1]}</div>
          </div>
          <div>
            <b className="text-sm">{w.name}</b>
            <div className="flex gap-3 mt-1.5 flex-wrap">
              <span className="font-mono text-11 text-ml-cream-dim">{w.sets} series</span>
              <span className="font-mono text-11 text-ml-cream-dim">{w.vol} vol</span>
              {w.pr && <span className="font-mono text-11 text-ml-green">🏆 {w.pr}</span>}
            </div>
          </div>
          <div className="font-mono text-[13px] text-ml-orange">{w.duration}</div>
        </div>
      ))}
    </div>
  );
}
