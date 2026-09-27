# Implementation Plan: Corregir una salida olvidada

**Branch**: `055-attendance-corrections` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

## Summary

- **Tipos**: `AttendanceEntry.correctedBy: string | null`.
- **Backend**: migración (`correctedBy`, `correctedAt` en `attendance_entries`); `attendance/clock-out-rule.ts` (puro: `clockOutProblem(clockIn, clockOut, now)`) con test; `getForgottenEntries(branchId)`, `closeEntry(id, clockOut, closer)` con `updateMany where clockOut = null`; `CloseEntryDto` (`@IsISO8601`); códigos `ENTRY_NOT_FOUND`, `ENTRY_ALREADY_CLOSED`, `INVALID_CLOCK_OUT`; rutas de gerente.
- **branch-app**: contrato `getForgottenEntries`/`closeEntry` + errores tipados (mock + HTTP); mock con un turno abierto de ayer y su "hoy" en hora local (antes UTC); store `forgottenShifts`; `AttendancePage` con "Turnos sin salida" (`datetime-local` con `min`/`max`) y la marca de corregida; textos es/en.

## Constitution Check

I ✅ contrato + mock + HTTP · II ✅ la regla de la hora la aplica el servidor · III ✅ quién corrigió sale del token · V ✅ unit puro y del service, e2e (incluida la nómina), tests del repositorio y HTTP, recorrido en navegador · VII ✅ CLAUDE.md de backend y branch-app, spec 038.
