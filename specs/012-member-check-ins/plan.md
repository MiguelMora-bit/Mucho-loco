# Implementation Plan: Registro de entradas (check-in)

**Branch**: `012-member-check-ins` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
Contrato (`@mucho-loco/types`): `CheckIn { visitedAt, firstToday }` y `CheckInResult` (= `AccessCheckResult` con `checkIn` obligatorio en `valid`); `Visit.durationMinutes: number | null`. Backend: migración (`visits.visitDay DATE` + único `(userId, visitDay)`, `durationMinutes` nullable, se borran `memberships.visits/streak`); `visit-stats.ts` puro (`mexicoDay`, `visitsThisMonth`, `currentStreak`) con unit; `CounterMembershipsService.checkIn` inserta con `ON CONFLICT DO NOTHING` y relee la visita del día; `POST /branches/:id/check-ins` reemplaza `GET member-access`; `MembershipsService` deriva visitas y racha. branch-app: `AccessMethod.checkAccess` → `CheckInResult`; HTTP hace POST; el mock lleva una bitácora en memoria; `QrValidationPage` muestra la entrada. customer-core: `formatDuration(null)` → "—".

## Constitution Check
I ✅ contrato primero, mock y HTTP · II ✅ la entrada la decide y registra el servidor · III ✅ tipos compartidos, `formatDuration` compartido · IV ✅ ISO, día en CDMX, textos traducidos · V ✅ unit de la aritmética de días, e2e contra Postgres, tests de branch-app · VI ✅ se borran dos columnas que nunca se llenaban · VII ✅ CLAUDE.md.

## Project Structure
```text
packages/types/src/index.ts
packages/customer-core/src/dates.ts (+ test)
apps/backend/prisma/{schema.prisma,migrations/*_member_check_ins}
apps/backend/src/memberships/{visit-stats.ts (+ spec), memberships.service.ts (+ spec)}
apps/backend/src/counter-memberships/{counter-memberships.controller.ts, .service.ts, dto/check-in.dto.ts}
apps/backend/test/branch-ops.e2e-spec.ts
apps/branch-app/src/lib/access/**, src/routes/QrValidationPage.tsx, src/lib/locales/{es,en}.json
```
