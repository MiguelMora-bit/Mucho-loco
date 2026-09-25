---

description: "Task list for Colores de rendimiento como nombre de paleta"
---

# Tasks: Colores de rendimiento como nombre de paleta

- [X] T001 [US1] `StatColor` y `PerformanceStat.color: StatColor` en `packages/types/src/index.ts`.
- [X] T002 [US1] Backend: `statColorOf(value)` (acepta nombre, `var(--x)` o los dos hex históricos, desconocido → `cream`) con unit; `toStat` lo usa; migración `UPDATE performance_stats SET color = …`; `seed.ts` con nombres.
- [X] T003 [US1] customer-core mock con nombres; web `Overview.tsx` pinta `var(--${color})`.
- [X] T004 [US1] Móvil: `colors[color]` con respaldo crema en `performance.tsx`; borrar `lib/css-color.ts` y su test; walkthrough de rendimiento en verde.
- [X] T005 Docs (`apps/mobile-app/CLAUDE.md` hallazgo resuelto) y validación.
