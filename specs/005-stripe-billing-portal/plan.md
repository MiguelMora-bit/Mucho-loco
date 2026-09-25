# Implementation Plan: Administrar la suscripción (portal de Stripe)

**Branch**: `005-stripe-billing-portal` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

## Summary
Endpoint de portal de Stripe + guardar la renovación cancelada (`cancel_at_period_end`) + `hasSubscription` en el contrato; botón "Administrar suscripción" y aviso de renovación cancelada en web y móvil.

## Technical Context
TypeScript 6 · NestJS + Prisma 6 (migración nueva) · Stripe SDK · customer-core · Next.js 15.5 · Expo 57 · Jest e2e / Vitest / Playwright (móvil, mock).

## Constitution Check
I ✅ mock alterna la renovación · II ✅ el estado lo decide Stripe (webhook + re-lectura); identidad por token · III ✅ contrato y reglas en customer-core · IV ✅ fechas al pintar, textos es/en · V ✅ unit + e2e contra Postgres + walkthrough · VI ✅ portal hospedado, sin pantallas propias · VII ✅ CLAUDE.md.

## Project Structure
```text
apps/backend/prisma/{schema.prisma,migrations/*_membership_renewal_canceled}
apps/backend/src/{memberships/memberships.service.ts,payments/*,notifications/notifications.service.ts,common/error-codes.ts}
apps/backend/test/membership-billing.e2e-spec.ts
packages/types/src/index.ts                        # hasSubscription, textos
packages/customer-core/src/{contract.ts,membership-rules.ts,membership-errors.ts,http/account.http.ts,mock/*}
packages/customer-core/messages/{es,en}.json
apps/customer-app/app/api/membership/portal/route.ts (+ test), components/{DashboardClient,dashboard/HomePane,dashboard/ProfilePane}.tsx
apps/mobile-app/src/components/account/Dashboard.tsx, tests/e2e/walkthrough.spec.ts
```

## Complexity Tracking
Toca 4 lugares (backend, customer-core, web, móvil): el contrato compartido obliga a moverlos juntos (constitución, "Flujo").
