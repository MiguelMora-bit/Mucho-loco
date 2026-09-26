# Implementation Plan: Resumen de la cadena e inventario global

**Branch**: `039-owner-dashboard` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

owner-panel: `routes/DashboardPage.tsx`, `stats.repository` (mock + HTTP), stores por sección. Backend: `reports.getBranchStats`, `inventory` (global).

## Dónde vive

- `apps/owner-panel/src/routes/DashboardPage.tsx`, `src/lib/repositories/stats.repository.ts`, `src/lib/stores/*`
- `apps/backend/src/{reports,inventory}/`

## Constitution Check

II ✅ cifras derivadas del registro de cobros · V ✅ e2e + navegador con datos reales.
