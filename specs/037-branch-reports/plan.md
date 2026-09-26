# Implementation Plan: Reportes e inventario local del gerente

**Branch**: `037-branch-reports` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

branch-app: `routes/ReportsPage.tsx`, `reports.repository`, `lib/reports.ts`. Backend: `reports` (`GET /branches/:id/reports/sales`).

## Dónde vive

- `apps/branch-app/src/routes/ReportsPage.tsx`, `src/lib/{reports.ts,repositories/reports.repository.ts}`
- `apps/backend/src/reports/`

## Constitution Check

V ✅ función pura + e2e contra el registro de cobros.
