---

description: "Trazabilidad de Checkout y pedidos de la tienda"
---

# Tasks: Checkout y pedidos de la tienda

Spec retroactivo: cada tarea es un requisito ya implementado y lo que lo verifica. Una tarea abierta es un hueco real de verificación.

- [X] FR-001/002 · `apps/backend/src/users/users.service.spec.ts` (precio del servidor) y `packages/customer-core/src/http/http.test.ts` (sin total en el body).
- [X] FR-003 · `apps/backend/src/payments/payments.service.spec.ts`, `apps/backend/test/payments.e2e-spec.ts`; sandbox de Stripe 2026-09-12.
- [X] FR-004 · `apps/customer-app/app/api/orders/route.test.ts`; `apps/mobile-app/src/lib/checkout.test.ts`.
- [X] FR-005 · `packages/customer-core/src/shipping.test.ts`; DTO en `apps/backend/test/payments.e2e-spec.ts`.
- [X] FR-006 · `PICKUP_REQUIRES_MEMBERSHIP` en `apps/backend/test/app.e2e-spec.ts`.
- [X] FR-007 · `packages/customer-core/src/orderStatus.test.ts`; `apps/customer-app/tests/e2e/shop-checkout.spec.ts`; walkthrough del móvil.
