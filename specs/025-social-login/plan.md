# Implementation Plan: Inicio de sesión con Google y Facebook

**Branch**: `025-social-login` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

Web: dos Route Handlers + `lib/pkce.ts`. Móvil: `lib/auth/social.ts` sobre `expo-auth-session`. Infra: IdPs y dominio en el módulo `cognito` de Terraform.

## Dónde vive

- `apps/customer-app/app/api/auth/social/{start,callback}/route.ts`, `lib/pkce.ts`, `components/account/SocialButtons.tsx`
- `apps/mobile-app/src/lib/auth/social.ts`
- `infra/modules/cognito/`

## Constitution Check

II ✅ PKCE + nonce, sin secretos en el cliente · VII ✅ credenciales fuera del repo.
