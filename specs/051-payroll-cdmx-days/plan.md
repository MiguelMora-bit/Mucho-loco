# Implementation Plan: Días trabajados en el calendario de CDMX

**Branch**: `051-payroll-cdmx-days` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

## Summary
`PayrollService.getAttendanceSummaries` compara `mexicoDay(entry.clockIn)` (de `memberships/visit-stats.ts`, el mismo de las visitas) contra `startDate`/`endDate` como `YYYY-MM-DD`, y usa ese día en el conjunto de días distintos. Se borra `endOfDay`, que solo existía para compensar comparar horas contra fechas. El e2e crea su periodo en el mes de CDMX. Sin migración ni cambio de contrato.

## Constitution Check
II ✅ la regla vive en el servidor · V ✅ unit en los bordes (antes fallaba) + e2e · VII ✅ CLAUDE.md del backend.
