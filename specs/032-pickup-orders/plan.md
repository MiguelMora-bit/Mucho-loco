# Implementation Plan: Pedidos para recoger en sucursal

**Branch**: `032-pickup-orders` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

branch-app: `routes/PickupOrdersPage.tsx`, `pickupOrder.repository` (mock + HTTP), `QrCameraScanner`. Backend: módulo `pickup-orders`.

## Dónde vive

- `apps/branch-app/src/routes/PickupOrdersPage.tsx`, `src/lib/repositories/pickupOrder.repository.ts`, `src/components/QrCameraScanner.tsx`
- `apps/backend/src/pickup-orders/`

## Constitution Check

II ✅ el servidor decide qué se puede entregar · V ✅ e2e tienda → mostrador.
