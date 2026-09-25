// Movido a @mucho-loco/types (2026-09-12) — backend también necesita este
// contrato ahora que el dominio `performance` se migró ahí. Re-export para
// no tocar los importadores existentes en este app.
export type { Workout, PerformanceSummary, PersonalRecord, HeatmapLevel } from '@mucho-loco/types';
