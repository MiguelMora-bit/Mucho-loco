# Implementation Plan: Validar el acceso en la puerta

**Branch**: `036-access-validation` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

branch-app: `lib/access/*` (interfaz, regla, un método por credencial, gemelos HTTP), `routes/QrValidationPage.tsx`, `components/QrCameraScanner.tsx`. Backend: `evaluateAccess` en `counter-memberships.service.ts` + `POST /branches/:id/check-ins`.

## Dónde vive

- `apps/branch-app/src/lib/access/**`, `src/routes/QrValidationPage.tsx`, `src/components/QrCameraScanner.tsx`
- `apps/backend/src/counter-memberships/counter-memberships.service.ts`

## Constitution Check

II ✅ la regla la decide el servidor · V ✅ regla pura con test + un test por método + e2e.
