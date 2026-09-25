# Implementation Plan: Heatmap de asistencia real

**Branch**: `016-attendance-heatmap` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
Regla pura de la cuadrícula, gemela en dos lados (el backend no depende de customer-core): `heatmapOf` en `apps/backend/src/memberships/visit-stats.ts` y `heatmapFromVisits` en `packages/customer-core/src/heatmap.ts`, cada una con su test. `PerformanceService.getHeatmap(userId)` lee las visitas de las últimas 52 semanas; el controller resuelve al socio con `UsersService` (como `community`). Contrato: `IPerformanceRepository.getHeatmap(email)`. Mock: del historial de `UserMockDatasource`. Migración que borra `heatmap_cells` y el enum `HeatmapLevel`; `seed.ts` sin heatmap. Web: `.heatmap-grid` con `grid-auto-flow: column` y 7 filas. Móvil: `scrollToEnd` al cargar.

## Constitution Check
I ✅ contrato + mock + HTTP con la misma regla · II ✅ la identidad sale del token · III ✅ regla compartida entre web y móvil · IV ✅ días de CDMX · V ✅ unit de las dos gemelas, e2e contra Postgres, walkthrough · VI ✅ se borra una tabla sembrada · VII ✅ CLAUDE.md.
