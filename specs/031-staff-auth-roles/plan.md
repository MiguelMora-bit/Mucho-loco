# Implementation Plan: Acceso del personal y roles

**Branch**: `031-staff-auth-roles` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

branch-app y owner-panel: `lib/cognito.ts`, `lib/jwt.ts`, `lib/derive{Staff,Owner}User.ts`, `components/layout/{ProtectedRoute,RequireManager}.tsx`. Backend: `auth/roles.decorator.ts` + `roles.guard.ts` (global, después del guard de Cognito).

## Dónde vive

- `apps/branch-app/src/{lib/cognito.ts,lib/jwt.ts,lib/deriveStaffUser.ts,lib/staffDirectory.ts,components/layout/*}`
- `apps/owner-panel/src/{lib/cognito.ts,lib/jwt.ts,lib/deriveOwnerUser.ts,components/layout/*}`
- `apps/backend/src/auth/{roles.decorator.ts,roles.guard.ts}`
- `infra/modules/cognito/` (grupos y app clients)

## Constitution Check

II ✅ el rol sale del token verificado, nunca del cliente · V ✅ e2e de auto-escalación y sesión fabricada.
