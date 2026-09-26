# Implementation Plan: Venta de mostrador

**Branch**: `033-counter-sale` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

branch-app: `routes/CounterSalePage.tsx` (pestaña de productos), `counterSale.repository` (mock + HTTP con errores tipados). Backend: `counter-sales` + `inventory`.

## Dónde vive

- `apps/branch-app/src/routes/{CounterSalePage.tsx,counter/ProductSaleTab.tsx}`, `src/lib/repositories/counterSale.{repository,errors}.ts`
- `apps/backend/src/{counter-sales,inventory}/`

## Constitution Check

II ✅ precio y stock en el servidor · V ✅ e2e + verificación en Postgres.
