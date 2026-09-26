---

description: "Trazabilidad de Facturación CFDI 4.0 (núcleo del backend)"
---

# Tasks: Facturación CFDI 4.0 (núcleo del backend)

Spec retroactivo: cada tarea es un requisito ya implementado y lo que lo verifica. Una tarea abierta es un hueco real de verificación.

- [X] FR-001/002 · `apps/backend/src/invoicing/fiscal-receipts.service.spec.ts`; `invoicing.e2e-spec.ts` (cola y arriendo en UTC).
- [X] FR-003 · `apps/backend/src/invoicing/invoicing.service.spec.ts`, `fiscal-mapping.spec.ts`; `invoicing.e2e-spec.ts`.
- [X] FR-004 · `invoicing.e2e-spec.ts` ("rejects an event whose signature does not check out").
- [X] FR-005 · `invoicing.e2e-spec.ts` (dueño lista, cuenta y cancela).
- [ ] Probar contra el sandbox de Facturapi (requiere la cuenta).
