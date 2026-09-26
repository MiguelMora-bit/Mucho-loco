---

description: "Task list for Pagar en mostrador el atraso"
---

# Tasks: Pagar en mostrador el atraso de una suscripción

- [X] T001 `OverdueBalance` en `packages/types`; `PAYMENT_PROVIDER_ERROR` en `error-codes.ts`.
- [X] T002 e2e (fallando) `apps/backend/test/counter-overdue.e2e-spec.ts` con Stripe sobreescrito: consultar, cobrar (out of band antes del registro), activa, 409 al repetir, webhook sin segundo cobro, Stripe caído no registra, sin suscripción 409.
- [X] T003 Backend: `overdueInvoice`/`settleOutOfBand`, `recordInvoice` ignora out-of-band, export; `getOverdue`/`settleOverdue`, DTO, rutas. Hace pasar T002.
- [X] T004 branch-app: repositorio (mock + HTTP + tests), `MembershipTab` (atraso, forma de pago, ticket), textos es/en.
- [X] T005 Docs y validación (backend unit/e2e, branch-app test/tsc/lint/build, integración de ruta 401).
