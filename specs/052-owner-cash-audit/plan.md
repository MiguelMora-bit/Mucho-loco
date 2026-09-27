# Implementation Plan: Auditoría de cortes de caja desde HQ

**Branch**: `052-owner-cash-audit` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

## Summary

- **Tipos** (`@mucho-loco/types`): `CashRegisterShift` gana `closedBy`, `countedCash`, `expectedCash` (nulos si no hay arqueo); nuevo `CashShiftAudit` (corte cerrado con sucursal, totales, movimientos, contado y diferencia).
- **Backend**: migración con las 7 columnas nuevas en `cash_register_shifts`; `cash-register/shift-totals.ts` (puro: `shiftTotals`, `cashDifference`) con test; `closeShift(id, countedCash, closer)` calcula las transacciones de la ventana, congela y cierra con `updateMany where status = open` (carrera → `SHIFT_ALREADY_CLOSED`); `CloseShiftDto`; `GET /cash-register/audit` (owner) con `mexicoMonthRange` de `invoicing/fiscal-mapping.ts` (función pura; mismo criterio que nómina importando `mexicoDay` de memberships).
- **branch-app**: `closeShift(shiftId, countedCash)` en contrato/mock/HTTP; `CashRegisterPage` pide el contado con vista previa de la diferencia; el historial muestra contado y diferencia; `cashDifference` en `lib/cashRegister.ts`.
- **owner-panel**: `cashAudit.repository` (mock + HTTP) con `getShifts(month, branchId?)` y `getTransactions(shiftId)`; `lib/cashAudit.ts` (resumen puro) con test; ruta `/cash-audit` en el nav; textos es/en.

## Constitution Check

I ✅ contrato + mock + HTTP en los dos apps · II ✅ quién cerró y los totales los pone el servidor · III ✅ `closedBy` del token · V ✅ unit puros, e2e, tests de repositorio, integración de rutas · VII ✅ CLAUDE.md de los 3 apps y spec 034.
