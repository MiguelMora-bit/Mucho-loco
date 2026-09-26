# Implementation Plan: Envíos a domicilio desde la bodega

**Branch**: `044-home-shipments` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

owner-panel: `routes/ShipmentsPage.tsx`, `shipments.repository` (+ `ShipmentStateError`). Backend: `shipments` + aviso en `notifications`.

## Dónde vive

- `apps/owner-panel/src/routes/ShipmentsPage.tsx`, `src/lib/repositories/shipments.*`
- `apps/backend/src/shipments/`

## Constitution Check

II ✅ el servidor valida estado y pago · V ✅ e2e tienda → bodega.
