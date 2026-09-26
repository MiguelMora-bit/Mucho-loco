# Implementation Plan: Checkout y pedidos de la tienda

**Branch**: `023-checkout-and-orders` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

Web: `CheckoutClient` → `/api/checkout` (Stripe) o `/api/orders` (efectivo), ambos server-side con la cookie de sesión. Móvil: `checkout.tsx` + `paymentRepository.createCheckoutSession` + `WebBrowser.openAuthSessionAsync` con regreso por deep link. Backend: `payments` (sesiones + webhook) y `users` (`POST /users/me/orders` efectivo).

## Dónde vive

- `apps/backend/src/payments/{payments.service.ts,payments.controller.ts}`, `src/users/{users.service.ts,dto/create-order.dto.ts,dto/shipping-address.dto.ts}`
- `apps/customer-app/components/CheckoutClient.tsx`, `app/api/{checkout,orders}/route.ts`
- `apps/mobile-app/src/app/checkout.tsx`, `src/lib/checkout.ts`
- `packages/customer-core/src/{shipping.ts,orderStatus.ts,pricing.ts}`

## Constitution Check

II ✅ el dinero lo decide el servidor (total, webhook, idempotencia) · III ✅ validación de dirección compartida · V ✅ e2e con Stripe sobreescrito + sandbox real.
