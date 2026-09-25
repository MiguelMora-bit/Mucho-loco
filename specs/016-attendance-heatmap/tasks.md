---

description: "Task list for Heatmap de asistencia real"
---

# Tasks: Heatmap de asistencia real

- [X] T001 [US1] Unit (fallando) + `heatmapOf` en `apps/backend/src/memberships/visit-stats.ts` (52×7, lunes primero, futuro vacío, niveles por duración, ventana).
- [X] T002 [US1] e2e (fallando) en `apps/backend/test/app.e2e-spec.ts`: forma 52×7, visita de hoy → `l2` en su cuadro, otro socio no la ve.
- [X] T003 [US1] `PerformanceService.getHeatmap(userId)`, controller con `UsersService`, módulo importa `UsersModule`; migración que borra `heatmap_cells` + enum; `seed.ts`. Hace pasar T002.
- [X] T004 [US1] customer-core: `heatmap.ts` (+ test, export), `getHeatmap(email)` en contrato, mock (del historial) y HTTP.
- [X] T005 [US1] Web: `.heatmap-grid` por columnas; página pasa el email.
- [X] T006 [US1] Móvil: pasa el email de la sesión; `scrollToEnd`; walkthrough.
- [X] T007 Docs y validación.
