# Implementation Plan: Nómina

**Branch**: `042-payroll` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

owner-panel: `routes/PayrollPage.tsx`, `payroll.repository`, `lib/payroll.ts` (mock). Backend: `payroll` (`payroll.math.ts`, recibos guardados) cruzado con `attendance`.

## Dónde vive

- `apps/owner-panel/src/routes/PayrollPage.tsx`, `src/lib/{payroll.ts,repositories/payroll.*}`
- `apps/backend/src/payroll/{payroll.service.ts,payroll.math.ts}`

## Constitution Check

II ✅ recibo emitido y guardado por el servidor · V ✅ e2e sucursal → HQ.
