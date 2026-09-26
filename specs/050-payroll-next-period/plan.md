# Implementation Plan: La nómina nunca se queda sin quincena

**Branch**: `050-payroll-next-period` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

## Summary
Backend: `nextPeriodRange(lastEndDate)` y `periodContaining(day)` puros en `payroll-periods.ts` (con test; `payroll.math.ts` es el ISR/IMSS ilustrativo y no se mezcla); `runPayroll` crea la siguiente dentro de su transacción si no hay una posterior; `openNextPeriod()` + `POST /payroll/periods/next` (owner, 409 `PERIOD_ALREADY_OPEN`, P2002 → 409); migración que pasa `startDate`/`endDate` a `DATE` y agrega índice único en `startDate`. owner-panel: gemela `nextPeriodRange` en `lib/payroll.ts`, `payrollRepository.openNextPeriod()` (mock + HTTP, `PeriodAlreadyOpenError`), el mock también abre la siguiente al correr, y la pantalla ofrece el botón cuando no hay quincena abierta.

## Constitution Check
I ✅ contrato + mock + HTTP · II ✅ el servidor decide las fechas y la base impide duplicados · V ✅ unit de la regla (gemelas), e2e, tests del repositorio · VII ✅ CLAUDE.md y spec 042.
