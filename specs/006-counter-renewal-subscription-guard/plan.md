# Implementation Plan: Renovación en mostrador sin doble cobro ni días perdidos

**Branch**: `006-counter-renewal-subscription-guard` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
`MemberAccessRecord.renewsOnline` (suscripción viva que se renueva: `stripeSubscriptionId && !renewalCanceled && no vencida`); `renew` de mostrador rechaza con 409 `MEMBER_RENEWS_ONLINE` y suma desde el vencimiento vigente; branch-app avisa, deshabilita y traduce el código a `MemberRenewsOnlineError`.

## Technical Context
NestJS + Prisma 6 (sin migración: `renewalCanceled` viene del spec 005) · Vite + React 19 branch-app · Jest e2e contra Postgres · Vitest.

## Constitution Check
I ✅ mock con la misma regla · II ✅ el backend decide (409), la UI solo avisa · III ✅ tipo en `@mucho-loco/types` · IV ✅ fechas ISO · V ✅ unit + e2e · VI ✅ no se cancelan suscripciones desde mostrador (fuera de alcance) · VII ✅ CLAUDE.md.

## Research (decisiones)
- **R1** `renewsOnline` en el registro de mostrador y no un endpoint aparte: mostrador ya busca al socio (`GET /members?qrCode=`) antes de cobrar.
- **R2** Con `renewalCanceled` se permite: la suscripción muere al fin del periodo y `grant` toma `max(expiresAt, periodEnd)`, así que un evento tardío no pisa el tiempo pagado en mostrador.
- **R3** Contar desde el vencimiento solo si el estado efectivo no es `expired` (mismo criterio que `renewalStartsOn` en línea).

## Project Structure
```text
packages/types/src/index.ts                          # MemberAccessRecord.renewsOnline
apps/backend/src/counter-memberships/counter-memberships.service.ts (+ spec)
apps/backend/src/common/error-codes.ts               # MEMBER_RENEWS_ONLINE
apps/backend/test/branch-ops.e2e-spec.ts
apps/branch-app/src/lib/{data.ts,datasources/{mock,http}/membership.*,repositories/membership.*}
apps/branch-app/src/routes/counter/MembershipTab.tsx, src/lib/locales/{es,en}.json
```

## Complexity Tracking
Sin violaciones.
