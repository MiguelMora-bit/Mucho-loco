---

description: "Task list for Renovación en mostrador sin doble cobro ni días perdidos"
---

# Tasks: Renovación en mostrador sin doble cobro ni días perdidos

## Phase 1: Backend (US1 + US2)

- [X] T001 `MemberAccessRecord.renewsOnline: boolean` en `packages/types/src/index.ts`; `toAccessRecord` lo deriva en `apps/backend/src/counter-memberships/counter-memberships.service.ts`.
- [X] T002 `memberRenewsOnline(qrCode)` → `MEMBER_RENEWS_ONLINE` en `apps/backend/src/common/error-codes.ts`.
- [X] T003 [US1] [US2] Unit (fallando) en `apps/backend/src/counter-memberships/counter-memberships.service.spec.ts`: suscripción viva → 409 sin `membershipPayment.create`; con `renewalCanceled` → cobra; vigente con 10 días → `expiresAt = vencimiento + periodo`; vencida → hoy + periodo.
- [X] T004 [US1] [US2] Implementar la regla y el cálculo en `renew`. Hace pasar T003.
- [X] T005 [US1] [US2] e2e en `apps/backend/test/branch-ops.e2e-spec.ts`: socio con `stripeSubscriptionId` → `GET /members?qrCode=` trae `renewsOnline: true`; renovar → 409 `MEMBER_RENEWS_ONLINE` sin pago; renovar a un vigente suma desde su vencimiento.

## Phase 2: branch-app (US1)

- [X] T006 [P] [US1] `renewsOnline` en `MEMBER_ACCESS_RECORDS` de `apps/branch-app/src/lib/data.ts` (Diego = true, resto false); mock `renewMembership` con la misma regla (`MemberRenewsOnlineError`) y cálculo; HTTP traduce el código; tests en `membership.repository.test.ts` y `branchOps.http.test.ts`.
- [X] T007 [US1] `apps/branch-app/src/routes/counter/MembershipTab.tsx`: aviso + cobro deshabilitado con `foundMember.renewsOnline`; `MemberRenewsOnlineError` del backend con el mismo aviso; textos es/en.

## Phase 3: Polish

- [X] T008 Docs (`apps/backend/CLAUDE.md` pendiente resuelto, `apps/branch-app/CLAUDE.md`) y validación (backend unit/e2e, branch-app test/`tsc -b`/lint/build, integración).
