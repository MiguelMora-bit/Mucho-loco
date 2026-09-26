---

description: "Trazabilidad de Registro de cobros"
---

# Tasks: Registro de cobros

Spec retroactivo: cada tarea es un requisito ya implementado y lo que lo verifica. Una tarea abierta es un hueco real de verificación.

- [X] FR-001/004 · `apps/backend/src/charges/charges.service.spec.ts` y los specs de `payments`, `pickup-orders`, `counter-sales`, `counter-memberships`, `membership-billing`.
- [X] FR-002 · CHECK `charges_exactly_one_source` en la migración; e2e borran `charge` antes que sus orígenes.
- [X] FR-003 · `payments.e2e-spec.ts`, `membership-billing.e2e-spec.ts` (reentregas).
- [X] FR-005 · `apps/backend/src/reports/reports.service.spec.ts`; `branch-ops.e2e-spec.ts` ("reports").
