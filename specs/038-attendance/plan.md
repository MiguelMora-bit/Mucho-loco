# Implementation Plan: Asistencia del personal

**Branch**: `038-attendance` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

branch-app: `routes/AttendancePage.tsx`, `attendance.repository`. Backend: `attendance` + cruce con `payroll`.

## Dónde vive

- `apps/branch-app/src/routes/AttendancePage.tsx`, `src/lib/repositories/attendance.*`
- `apps/backend/src/attendance/`, `src/payroll/`

## Constitution Check

II ✅ invariante en la base · V ✅ e2e sucursal → HQ.
