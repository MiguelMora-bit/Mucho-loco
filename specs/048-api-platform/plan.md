# Implementation Plan: Plataforma de la API y contrato compartido

**Branch**: `048-api-platform` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

Backend: `main.ts` (rawBody, ValidationPipe, CORS), `auth/`, `common/error-codes.ts`, `prisma/`. Compartido: `packages/api-client`, `packages/types`, `packages/customer-core/{contract,mock,http}`. Cada app: `lib/datasources/http/` y su `config` de data source.

## Dónde vive

- `apps/backend/src/{main.ts,app.module.ts,auth/,common/,prisma/}`
- `packages/api-client/src/index.ts`
- `packages/types/src/index.ts`, `packages/customer-core/src/{contract.ts,mock,http}`

## Constitution Check

I, II y III son este spec: contrato primero, el servidor como fuente de verdad, lógica compartida en `packages/`.
