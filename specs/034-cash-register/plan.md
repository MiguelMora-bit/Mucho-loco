# Implementation Plan: Caja: turnos y corte

**Branch**: `034-cash-register` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

branch-app: `routes/CashRegisterPage.tsx`, `cashRegisterShift.repository`, `lib/cashRegister.ts` (`calculateShiftTotals`). Backend: `cash-register` + índice parcial en la migración `20260912090000_branch_ops_and_hq`.

## Dónde vive

- `apps/branch-app/src/routes/CashRegisterPage.tsx`, `src/lib/{cashRegister.ts,repositories/cashRegisterShift.*}`
- `apps/backend/src/cash-register/`

## Constitution Check

II ✅ invariante en la base, no solo en el código · V ✅ e2e + función pura con test.
