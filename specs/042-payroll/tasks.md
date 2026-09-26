---

description: "Trazabilidad de Nómina"
---

# Tasks: Nómina

Spec retroactivo: cada tarea es un requisito ya implementado y lo que lo verifica. Una tarea abierta es un hueco real de verificación.

- [X] FR-001 · `branch-ops.e2e-spec.ts` ("attendance → payroll").
- [X] FR-002/003 · `apps/backend/src/payroll/payroll.service.spec.ts`; `apps/owner-panel/src/lib/repositories/payroll.repository.test.ts`.
- [X] FR-004 · `apps/owner-panel/src/lib/payroll.test.ts`.
- [X] FR-005 · rol `owner` en `payroll.controller.ts`; `hq.integration.test.ts` (401 sin token).
- [ ] Crear la siguiente quincena (endpoint + pantalla): sin esto la nómina se detiene tras cerrar la quincena sembrada.
