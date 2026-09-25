# Implementation Plan: El registro web pide el teléfono

**Branch**: `007-web-signup-phone` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
`SignupForm` cambia cumpleaños por teléfono; `AccountClient` valida con `toE164` y manda `phone`; `/api/auth/register` revalida (400 `INVALID_PHONE`) y agrega `phone_number` a `UserAttributes`.

## Technical Context
Next.js 15.5 · `@aws-sdk/client-cognito-identity-provider` · `@mucho-loco/customer-core/phone` · Vitest.

## Constitution Check
I ✅ sin cambio de contrato de datos · II ✅ el servidor revalida · III ✅ `toE164` compartido · IV ✅ textos es/en · V ✅ tests de la ruta · VI ✅ · VII ✅ CLAUDE.md.

## Project Structure
```text
packages/types/src/index.ts, packages/customer-core/messages/{es,en}.json   # phoneLabel/phoneNote, invalidPhone; fuera birthdayLabel
apps/customer-app/components/{AccountClient.tsx,account/SignupForm.tsx}
apps/customer-app/app/api/auth/register/route.ts (+ test)
```

## Complexity Tracking
Sin violaciones.
