# Implementation Plan: Tienda: catálogo, detalle y carrito

**Branch**: `022-catalog-and-cart` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

Repositorios de catálogo en customer-core (mock + HTTP) usados por la web (`app/[locale]/page.tsx`, `product/[id]`) y el móvil (pestaña Tienda, `product/[id].tsx`); carrito como estado local persistido. Backend: módulo `products` de solo lectura.

## Dónde vive

- `packages/customer-core/src/{data.ts,mock/product.mock.ts,http/*}`
- `apps/customer-app/lib/stores/cart.store.ts`, `components/MuchoLoco.tsx` (tienda), `app/[locale]/product/[id]/`
- `apps/mobile-app/src/app/(tabs)/shop.tsx`, `src/app/product/[id].tsx`, `src/lib/cart.ts`, `src/lib/images.ts`
- `apps/backend/src/products/`

## Constitution Check

I ✅ contrato con mock y HTTP · III ✅ catálogo y reglas en customer-core · IV ✅ `LocalizedString` · V ✅ test de contrato mock vs HTTP.
