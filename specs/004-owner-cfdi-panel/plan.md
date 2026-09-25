# Implementation Plan: Facturas (CFDI) en el panel del dueño

**Branch**: `004-owner-cfdi-panel` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

## Summary
Página `/invoicing` en owner-panel sobre los endpoints de facturación del dueño que ya existen, más un filtro `?month=` en el backend para listar el mes completo y exportarlo a CSV.

## Technical Context
TypeScript 6 · NestJS (solo el filtro) · Vite + React 19 + react-router + react-i18next + Tailwind · `@mucho-loco/api-client` (`getFile`) · Vitest / Jest e2e · mock-first.

## Constitution Check
I ✅ repositorio mock/HTTP · II ✅ la cancelación la decide el backend/SAT; nada de montos del cliente · III ✅ `Cfdi`/`InvoicingSummary` de `@mucho-loco/types`, cliente HTTP compartido · IV ✅ fechas ISO al pintar, es/en · V ✅ unit + e2e + integración de rutas · VI ✅ CSV en el navegador, sin endpoint de exportación · VII ✅ CLAUDE.md.

## Project Structure
```text
apps/backend/src/invoicing/{fiscal-mapping.ts,invoicing.service.ts,invoicing.controller.ts}  # ?month=
apps/owner-panel/src/lib/repositories/{invoicing.repository.ts,invoicing.errors.ts} (+ test)
apps/owner-panel/src/lib/datasources/{mock/invoicing.mock.ts,http/invoicing.http.ts}
apps/owner-panel/src/lib/cfdiCsv.ts (+ test), src/lib/currentMonth.ts
apps/owner-panel/src/routes/InvoicingPage.tsx, App.tsx, components/layout/AppShell.tsx, lib/locales/{es,en}.json
```

## Complexity Tracking
Sin violaciones.
