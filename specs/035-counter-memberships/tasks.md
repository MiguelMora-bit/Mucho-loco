---

description: "Trazabilidad de Altas y renovaciones de membresía en mostrador"
---

# Tasks: Altas y renovaciones de membresía en mostrador

Spec retroactivo: cada tarea es un requisito ya implementado y lo que lo verifica. Una tarea abierta es un hueco real de verificación.

- [X] FR-001/002 · `branch-ops.e2e-spec.ts` ("finds the new member by their minted QR code", "finds a member by fingerprint"); `apps/branch-app/src/lib/fingerprintScanner.test.ts`.
- [X] FR-003 · `branch-ops.e2e-spec.ts` ("rejects a signup that tries to set its own price", precio fijo de `all`); `apps/branch-app/src/lib/pricing.test.ts`.
- [X] FR-004 · `apps/backend/src/counter-memberships/counter-memberships.service.spec.ts`; `branch-ops.e2e-spec.ts`.
- [X] FR-005 · `branch-ops.e2e-spec.ts` ("records the card type of a counter renewal in the charge").
