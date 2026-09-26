# Implementation Plan: Contratar y pagar la membresía

**Branch**: `026-membership-billing` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

Backend: `payments/membership-billing.service.ts` (Stripe) + `memberships/` (dominio, estado efectivo, cron). Web: `/membership` + `MembershipCheckoutClient` + `/api/membership/{checkout,invoice}`. Móvil: pantalla `membership`. Reglas compartidas en `customer-core/membership-rules` y precios en `customer-core/pricing`.

## Dónde vive

- `apps/backend/src/payments/membership-billing.service.ts`, `src/memberships/{membership-plans,membership-status,memberships.service}.ts`
- `apps/customer-app/app/[locale]/(account)/membership/`, `components/MembershipCheckoutClient.tsx`, `app/api/membership/*`
- `apps/mobile-app/src/app/membership.tsx`
- `packages/customer-core/src/{membership-rules,pricing,membership-errors}.ts`

## Constitution Check

II ✅ Stripe decide el estado; el servidor pone el precio · V ✅ e2e del ciclo completo + sandbox.
