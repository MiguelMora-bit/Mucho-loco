# Implementation Plan: Cifras reales en el inicio del panel

**Branch**: `013-dashboard-visit-stats` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
`MembershipInfo` gana `visitsLastMonth`, `bestStreak`, `branchesThisMonth`. Backend: `visit-stats.ts` suma `visitsInMonth`/`previousMonth`, `longestStreak` y `branchesInMonth`; `getForUser` lee también `branchId` de cada visita. Mock (`user.mock.ts`) con valores curados que reproducen lo que antes decía el texto fijo. Mensajes: `statVisitsDelta` → `statVisitsDeltaSuffix` ("vs mes anterior"), `statStreakDelta` → `statBestStreakLabel` ("Mejor racha:"). `HomePane` arma los textos con los números.

## Constitution Check
I ✅ contrato + mock + HTTP · II ✅ el servidor calcula de sus filas · IV ✅ CDMX, textos traducidos sin números · V ✅ unit de la aritmética, e2e contra Postgres · VI ✅ campos al lado de los que ya existen · VII ✅ CLAUDE.md.

## Project Structure
```text
packages/types/src/index.ts
packages/customer-core/messages/{es,en}.json, src/mock/user.mock.ts, src/membership-rules.test.ts
apps/backend/src/memberships/{visit-stats.ts (+ spec), memberships.service.ts (+ spec)}
apps/backend/test/branch-ops.e2e-spec.ts
apps/customer-app/components/dashboard/HomePane.tsx
```
