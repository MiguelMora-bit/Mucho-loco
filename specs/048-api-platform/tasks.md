---

description: "Trazabilidad de Plataforma de la API y contrato compartido"
---

# Tasks: Plataforma de la API y contrato compartido

Spec retroactivo: cada tarea es un requisito ya implementado y lo que lo verifica. Una tarea abierta es un hueco real de verificación.

- [X] FR-001 · `apps/customer-app/tests/integration/{catalog,landing}.contract.test.ts`; `packages/customer-core/src/http/http.test.ts`.
- [X] FR-002/003 · `apps/backend/test/app.e2e-spec.ts` ("auth guard", campo extra, usuario A vs B).
- [X] FR-004 · `apps/branch-app/src/lib/datasources/http/*.http.test.ts`, `apps/owner-panel/src/lib/datasources/http/hq.http.test.ts` (traducción de códigos).
- [X] FR-005 · `packages/api-client/src/index.test.ts`; integración de rutas en `customer-app`, `branch-app` y `owner-panel`.
- [X] Instalar y montar `@nestjs/swagger` — ✅ spec [056](../056-openapi-docs/spec.md): `/docs` y `/docs-json`.
