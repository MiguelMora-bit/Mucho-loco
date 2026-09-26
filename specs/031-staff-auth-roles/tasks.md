---

description: "Trazabilidad de Acceso del personal y roles"
---

# Tasks: Acceso del personal y roles

Spec retroactivo: cada tarea es un requisito ya implementado y lo que lo verifica. Una tarea abierta es un hueco real de verificación.

- [X] FR-001 · `apps/branch-app/src/lib/deriveStaffUser.test.ts`, `apps/owner-panel/src/lib/deriveOwnerUser.test.ts`.
- [X] FR-002 · `apps/{branch-app,owner-panel}/src/lib/jwt.test.ts`; `tests/e2e/auth.spec.ts` de ambos (sesión fabricada, auto-escalación).
- [X] FR-003 · `RequireManager` verificado en navegador (luis sin Caja/Reportes, ana con ellos, 2026-09-12).
- [X] FR-004 · `apps/backend/test/branch-ops.e2e-spec.ts` ("roles").
