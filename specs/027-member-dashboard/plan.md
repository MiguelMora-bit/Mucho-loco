# Implementation Plan: Panel del socio

**Branch**: `027-member-dashboard` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

Web: `app/[locale]/(account)/dashboard/page.tsx` + `components/DashboardClient.tsx` + `components/dashboard/*`. Móvil: pestaña Cuenta con `components/account/Dashboard.tsx` y `app/qr.tsx`. Backend: `GET /users/me`, `/users/me/{membership,visits,orders}`.

## Dónde vive

- `apps/customer-app/components/{DashboardClient.tsx,dashboard/*}`
- `apps/mobile-app/src/components/account/Dashboard.tsx`, `src/app/qr.tsx`, `src/lib/use-max-brightness.ts`
- `apps/backend/src/users/`, `src/memberships/`

## Constitution Check

I ✅ mismos repositorios en web y móvil · IV ✅ fechas ISO formateadas al pintar.
