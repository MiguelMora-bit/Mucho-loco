---

description: "Trazabilidad de Contratar y pagar la membresía"
---

# Tasks: Contratar y pagar la membresía

Spec retroactivo: cada tarea es un requisito ya implementado y lo que lo verifica. Una tarea abierta es un hueco real de verificación.

- [X] FR-001 · `packages/customer-core/src/pricing.test.ts`; `membership-billing.e2e-spec.ts` ("rejects a client-supplied amount").
- [X] FR-002/003 · `apps/backend/src/payments/membership-billing.service.spec.ts`, `membership-billing.e2e-spec.ts`.
- [X] FR-004 · `apps/backend/src/memberships/membership-status.spec.ts`, `memberships.service.spec.ts`.
- [X] FR-005 · `packages/customer-core/src/membership-rules.test.ts`; `membership-billing.e2e-spec.ts`.
- [X] FR-006 · `membership-billing.e2e-spec.ts`; `apps/customer-app/lib/repositories/payment.repository.test.ts`.
- [ ] Renovación natural al fin de periodo contra Stripe real (test clocks).
