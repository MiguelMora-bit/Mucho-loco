# Implementation Plan: Comunidad entre socios

**Branch**: `028-community` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

Backend: módulo `community`. Web: `CommunityPane` + `/api/community/posts`, `/like`, `/comments`. Móvil: pantalla `community`.

## Dónde vive

- `apps/backend/src/community/`
- `apps/customer-app/components/dashboard/CommunityPane.tsx`, `app/api/community/*`
- `apps/mobile-app/src/app/community.tsx`
- `packages/customer-core/src/{mock/community.mock.ts,http/account.http.ts}`

## Constitution Check

II ✅ identidad del token · V ✅ e2e de dos usuarios contra Postgres.
