# Implementation Plan: Afluencia por sucursal en el panel del dueño

**Branch**: `014-branch-traffic` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
`BranchStatsSummary` gana `checkInsToday` y `checkIns`. `ReportsService.getBranchStats` agrega dos `visit.groupBy` por `branchId` (`visitDay` = hoy en CDMX; `visitedAt >= since`). owner-panel: mock `BRANCH_STATS` con cifras, dos columnas y una tarjeta de total en `DashboardPage`, textos es/en. De paso, se corrige `apps/backend/CLAUDE.md` ("Auto-provisión" ya no crea membresía desde 2026-09-13).

## Constitution Check
I ✅ contrato + mock + HTTP · II ✅ el servidor cuenta de sus filas · IV ✅ día de CDMX, textos traducidos · V ✅ e2e contra Postgres con delta · VI ✅ sin endpoint nuevo · VII ✅ CLAUDE.md (incluida la corrección).

## Project Structure
```text
packages/types/src/index.ts
apps/backend/src/reports/reports.service.ts, test/branch-ops.e2e-spec.ts
apps/owner-panel/src/{lib/data.ts, routes/DashboardPage.tsx, lib/locales/{es,en}.json}
```
