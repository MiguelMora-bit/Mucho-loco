# Implementation Plan: Registro de cobros

**Branch**: `045-charges-ledger` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

Backend: `src/charges/` (servicio único) llamado desde `payments`, `pickup-orders`, `counter-sales`, `counter-memberships` y `membership-billing`. Migración `20260914150000_charges_ledger` con el CHECK de origen único.

## Dónde vive

- `apps/backend/src/charges/`
- `apps/backend/prisma/migrations/20260914150000_charges_ledger/`

## Constitution Check

II ✅ el dinero se registra donde se confirma, en la misma transacción · V ✅ unit por canal + e2e de reentregas.
