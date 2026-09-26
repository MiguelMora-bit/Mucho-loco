# Implementation Plan: Registro e inicio de sesión del socio

**Branch**: `024-member-auth` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

Web: Route Handlers de Next con `@aws-sdk/client-cognito-identity-provider`, `lib/jwt.ts` (jose), middleware por cookie + verificación en `getCurrentUserEmail`. Móvil: `lib/auth/{cognito,mock,index}.ts` + `stores/session.store.ts`. Backend: `auth/` (guard, verificador, `@CurrentUser`) y `UsersService.findOrCreateByCognito`.

## Dónde vive

- `apps/customer-app/app/api/auth/*`, `lib/{jwt,session,auth,cognito,cognito-errors}.ts`, `middleware.ts`, `components/AccountClient.tsx`
- `apps/mobile-app/src/lib/auth/*`, `src/lib/stores/session.store.ts`, `src/components/auth/AuthPanel.tsx`
- `apps/backend/src/auth/*`, `src/users/users.service.ts`
- `packages/customer-core/src/cognito-errors.ts`

## Constitution Check

II ✅ la identidad sale del token verificado · V ✅ e2e contra Cognito real (2026-09-12 y 2026-09-26).
