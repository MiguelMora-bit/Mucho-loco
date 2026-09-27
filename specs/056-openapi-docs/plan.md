# Implementation Plan: Documentación OpenAPI del backend

**Branch**: `056-openapi-docs` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

## Summary

`@nestjs/swagger` 11 en `apps/backend`; plugin del CLI en `nest-cli.json` (`introspectComments`); `src/api-docs.ts` con `apiDocsEnabled(env)`, `markPublicOperations(document)`, `buildApiDocument(app)` y `setupApiDocs(app)`; `main.ts` lo monta si está habilitado; `@Public()` = `SetMetadata` + `ApiExtension('x-public', true)`. Tests: unit de las funciones puras y e2e `test/api-docs.e2e-spec.ts`. `.env.example` documenta `API_DOCS`.

## Constitution Check

V ✅ unit + e2e · VII ✅ CLAUDE.md del backend, spec 048, índice. Sin cambios de contrato para los frontends.
