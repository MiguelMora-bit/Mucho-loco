# Implementation Plan: Idiomas (español e inglés) y fechas

**Branch**: `030-i18n` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

`packages/customer-core/{messages,src/translations.ts,src/dates.ts}`; web `i18n/{routing,request}.ts`, `lib/hooks/useT.ts`; móvil `src/lib/i18n.ts`; branch-app y owner-panel `src/lib/i18n.ts` + `locales/`.

## Dónde vive

- `packages/customer-core/messages/*.json`, `src/translations.ts`, `src/dates.ts`
- `apps/customer-app/i18n/*`, `lib/hooks/useT.ts`, `lib/i18n-href.ts`
- `apps/mobile-app/src/lib/{i18n,mobile-messages}.ts`
- `apps/{branch-app,owner-panel}/src/lib/{i18n.ts,locales/,dates.ts}`

## Constitution Check

IV ✅ es el principio completo: ISO en el contrato, idioma al pintar.
