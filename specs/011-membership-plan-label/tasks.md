---

description: "Task list for Nombre del plan de membresía traducido"
---

# Tasks: Nombre del plan de membresía traducido

- [X] T001 [US1] `MembershipInfo.periodKey: PlanKey` (sin `plan`) y `Translations.membershipPlan` en `packages/types/src/index.ts`; textos en `packages/customer-core/messages/{es,en}.json`; se quita `dashboard.home.statDaysLeftDelta`.
- [X] T002 [US1] Test (fallando) y `membershipPlanLabel(t, { tierKey, periodKey })` en `packages/customer-core/src/membership-rules.ts`.
- [X] T003 [US1] Backend: `toMembershipInfo` manda `periodKey`, sin etiquetas; unit y e2e lo verifican (`periodKey` presente, `plan` ausente).
- [X] T004 [US1] Mock `user.mock.ts` con `periodKey`, sin etiquetas; fixtures de tests.
- [X] T005 [US1] customer-app: `HomePane` (encabezado + tarjeta de días restantes), `ProfilePane`, `AccessPane` con el helper.
- [X] T006 [US1] mobile-app: `Dashboard` con el helper; walkthrough verifica el plan en es y en.
- [X] T007 Docs (`apps/backend/CLAUDE.md` "Derivar en vez de guardar", cifras falsas del panel como pendiente en `apps/customer-app/CLAUDE.md`) y validación: tsc, tests, e2e backend, build web, walkthrough móvil.
