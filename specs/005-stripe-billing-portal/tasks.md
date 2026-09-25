---

description: "Task list for Administrar la suscripción (portal de Stripe)"
---

# Tasks: Administrar la suscripción (portal de Stripe)

## Phase 1: Backend

- [X] T001 Columna `Membership.renewalCanceled` + migración `membership_renewal_canceled` (dev y test).
- [X] T002 `syncSubscription` copia `cancel_at_period_end || cancel_at`; `grant` la guarda junto con la suscripción; `detachSubscription` la limpia; `MembershipInfo.autoRenews`/`hasSubscription` derivados — con unit en `membership-billing.service.spec.ts` y `memberships.service.spec.ts`.
- [X] T003 Avisos de "por vencer" también con `renewalCanceled` (`notifications.service.ts` + spec).
- [X] T004 `POST /payments/billing-portal-sessions` (`BillingPortalDto`, `openBillingPortal`, `NO_BILLING_ACCOUNT`) + unit.
- [X] T005 e2e en `membership-billing.e2e-spec.ts`: sin suscripción 409, portal 201, cancelar en portal → `autoRenews:false`/`hasSubscription:true` y contratar sigue 409, reactivar → `autoRenews:true`.

## Phase 2: customer-core

- [X] T006 `MembershipInfo.hasSubscription` en `@mucho-loco/types`; `purchaseBlock`/`renewalStartsOn` con `hasSubscription` (+ tests); `NO_BILLING_ACCOUNT` en `membership-errors.ts`.
- [X] T007 `IPaymentRepository.openBillingPortal` + HTTP (+ test) + mock que alterna la renovación (`toggleRenewal`, + test); textos `manageSubscription`, `renewalCanceledPrefix`, `reactivateRenewal`, `portalError`.

## Phase 3: US1/US2 web

- [X] T008 [US1] `app/api/membership/portal/route.ts` (+ test: 401, 400, 409, 200).
- [X] T009 [US1] [US2] `DashboardClient`/`HomePane`: "Administrar suscripción" junto a "se renueva sola"; banner de renovación cancelada con "Reactivar renovación"; el banner de "por vencer" solo sin suscripción; `ProfilePane` con `hasSubscription`.

## Phase 4: US1/US2 móvil

- [X] T010 [US1] [US2] `Dashboard.tsx`: mismo botón y banner vía `WebBrowser.openAuthSessionAsync`; paso de walkthrough (cancelar → reactivar, mock).

## Phase 5: Polish

- [X] T011 Documentar en `apps/backend/CLAUDE.md` (quitar "Portal de cliente" de pendientes), `apps/customer-app/CLAUDE.md`, `apps/mobile-app/CLAUDE.md`.
- [X] T012 Validación: backend unit + e2e, customer-core, customer-app (tsc/lint/test/build), mobile (tsc/lint/test/walkthrough).
