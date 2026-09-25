# Implementation Plan: Crédito o débito en los cobros con tarjeta de mostrador

**Branch**: `009-counter-card-type` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
Enum `CardType` (credit|debit) y columna nullable `cardType` en `CounterSale` y `MembershipPayment`; DTOs con `cardType` opcional (solo cuenta con `card`); `ChargesService` registra `card_credit`/`card_debit`. branch-app: sub-selector "¿Crédito o débito?" obligatorio con tarjeta, en venta y membresías; repositorios reciben `cardType`.

## Technical Context
NestJS + Prisma 6 (migración) · Vite/React branch-app · Jest unit + e2e · Vitest.

## Constitution Check
II ✅ la forma de pago fiscal sale del registro de cobros · III ✅ `CardType` en `@mucho-loco/types` · V ✅ unit + e2e · VI ✅ sin tocar `PaymentMethod` (corte de caja intacto) · VII ✅ CLAUDE.md.

## Project Structure
```text
apps/backend/prisma/{schema.prisma,migrations/*_counter_card_type}
apps/backend/src/{charges/charges.service.ts,counter-sales/*,counter-memberships/*} (+ specs, e2e)
packages/types/src/index.ts                       # CardType; CounterSale/MembershipPayment.cardType
apps/branch-app/src/{lib/repositories,lib/datasources,routes/counter/*,lib/locales}
```

## Complexity Tracking
Sin violaciones.
