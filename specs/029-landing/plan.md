# Implementation Plan: Landing: sucursales, planes, avisos y redes

**Branch**: `029-landing` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

Web: `app/[locale]/page.tsx` (Server Component) + `components/MuchoLoco.tsx` y `components/landing/*`, stores de `lib/stores/`. Móvil: pestañas Inicio y Sucursales. Backend: módulos `branches`, `membership-tiers` (en `memberships`), `announcements`, `social`, todos `@Public()`.

## Dónde vive

- `apps/customer-app/components/landing/*`, `components/MuchoLoco.tsx`, `lib/stores/*`, `lib/seo.ts`
- `apps/mobile-app/src/app/(tabs)/{index,branches}.tsx`
- `apps/backend/src/{branches,announcements,social}/`, `src/memberships/`

## Constitution Check

I ✅ contrato público con test de contrato · III ✅ datos semilla compartidos · IV ✅ `LocalizedString`.
