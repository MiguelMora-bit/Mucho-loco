---

description: "Task list for Documentación OpenAPI del backend"
---

# Tasks: Documentación OpenAPI del backend

- [X] T001 Instalar `@nestjs/swagger` 11 (pnpm respeta el candado de antigüedad); `@scarf/scarf` (telemetría de `swagger-ui-dist`) con el build deshabilitado en `pnpm-workspace.yaml`. Plugin del CLI en `nest-cli.json` (`introspectComments`).
- [X] T002 `src/api-docs.ts` (`apiDocsEnabled`, `markPublicOperations`, `buildApiDocument`, `setupApiDocs`) + unit (3); `@Public()` agrega `x-public`; `main.ts` lo monta si está habilitado.
- [X] T003 e2e `test/api-docs.e2e-spec.ts` (4): `/docs` y `/docs-json` sin token, rutas de 050–055 presentes, Bearer global, públicas sin candado, etiquetas por controller.
- [X] T004 Validación: `nest build` con el plugin y `dist` corriendo: 78 rutas, 28 esquemas de DTO con las descripciones de los comentarios, 26 etiquetas; con `NODE_ENV=production`, `/docs` → 404. Regresión: 372 unit, `app.e2e` 45/45, `payments.e2e` 11/11. Docs: CLAUDE.md raíz y del backend, `.env.example`, spec 048, índice.
