---

description: "Task list for Registro de entradas (check-in)"
---

# Tasks: Registro de entradas (check-in)

## Phase 1: Contrato
- [X] T001 `CheckIn`, `CheckInResult`, `Visit.durationMinutes: number | null` en `packages/types/src/index.ts`; `formatDuration(null)` → "—" en `packages/customer-core/src/dates.ts` con test.

## Phase 2: Backend
- [X] T002 Migración `*_member_check_ins`: `visits.visitDay DATE NOT NULL` (backfill en hora de CDMX), único `(userId, visitDay)`, `durationMinutes` nullable, drop `memberships.visits/streak`; `schema.prisma`.
- [X] T003 Unit (fallando) + `src/memberships/visit-stats.ts`: `mexicoDay(date)`, `visitsThisMonth(days, now)`, `currentStreak(days, now)` (hoy o ayer, CDMX, cruce de mes/medianoche).
- [X] T004 `MembershipsService.getForUser` deriva `visits`/`streak` de las visitas; `users.service` `toVisit` con duración nullable; unit.
- [X] T005 [US1] e2e (fallando) en `test/branch-ops.e2e-spec.ts`: `POST /branches/:id/check-ins` (valid registra con `checkIn.firstToday`, segundo no, negados no registran, 400 con dos métodos o ninguno); socio de la app: tras entrar, `/users/me/membership` `visits: 1, streak: 1` y `/users/me/visits` con `durationMinutes: null`. Limpieza de `visits`.
- [X] T006 [US1] `CheckInDto`, `CounterMembershipsService.checkIn`, `POST check-ins` en el controller; se quita `GET member-access`. Hace pasar T005.

## Phase 3: branch-app
- [X] T007 [US1] `AccessMethod.checkAccess` devuelve `CheckInResult`; HTTP → `POST /branches/:id/check-ins` con body; mock: bitácora en memoria (`mockCheckIns.ts`) con primera entrada del día; tests.
- [X] T008 [US1] `QrValidationPage`: "Entrada registrada · HH:MM" o "Ya había entrado hoy a las HH:MM"; textos es/en.

## Phase 4: Clientes del socio y cierre
- [X] T009 [US2] Web y móvil pintan duración nula como "—" (vía `formatDuration`); tsc/tests.
- [X] T010 Docs (`apps/backend/CLAUDE.md`, `apps/branch-app/CLAUDE.md`, CLAUDE.md raíz "QR de acceso") y validación: tsc de todo, unit, e2e backend, branch-app test/lint/build, integración de ruta (401 no 404), walkthrough móvil.
