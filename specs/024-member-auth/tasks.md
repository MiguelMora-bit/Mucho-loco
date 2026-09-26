---

description: "Trazabilidad de Registro e inicio de sesión del socio"
---

# Tasks: Registro e inicio de sesión del socio

Spec retroactivo: cada tarea es un requisito ya implementado y lo que lo verifica. Una tarea abierta es un hueco real de verificación.

- [X] FR-001 · `app/api/auth/register/route.test.ts`; `apps/mobile-app/src/lib/auth/auth.test.ts`, `src/lib/phone.test.ts`.
- [X] FR-002 · `lib/jwt.test.ts`, `lib/session.test.ts`, `lib/auth.test.ts`; `tests/e2e/auth.spec.ts` (cookie fabricada).
- [X] FR-003 · `apps/mobile-app/src/lib/auth/cognito.test.ts`, `auth.test.ts` (needsRefresh); verificado contra Cognito real 2026-09-12.
- [X] FR-004 · `packages/customer-core/src/cognito-errors.test.ts`, `apps/customer-app/lib/cognito-errors.test.ts`.
- [X] FR-005 · `apps/backend/test/app.e2e-spec.ts` ("auth guard").
- [X] FR-006 · `apps/backend/src/users/users.service.spec.ts`; e2e "a brand-new member opening the mobile dashboard".
