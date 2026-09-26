# Implementation Plan: Facturación CFDI 4.0 (núcleo del backend)

**Branch**: `046-cfdi-core` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

Backend: `src/invoicing/` (`fiscal-receipts.service.ts` cola + cron, `invoicing.service.ts` factura/cancelación, `fiscal-mapping.ts`, controladores de socio, dueño, tickets y webhook).

## Dónde vive

- `apps/backend/src/invoicing/*`
- `apps/backend/src/charges/charges.service.ts` (crea el recibo)

## Constitution Check

II ✅ el cobro no depende del PAC; el estado lo dice Facturapi · V ✅ unit + e2e con Facturapi sobreescrito.
