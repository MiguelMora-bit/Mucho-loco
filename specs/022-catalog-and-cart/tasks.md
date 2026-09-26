---

description: "Trazabilidad de Tienda: catálogo, detalle y carrito"
---

# Tasks: Tienda: catálogo, detalle y carrito

Spec retroactivo: cada tarea es un requisito ya implementado y lo que lo verifica. Una tarea abierta es un hueco real de verificación.

- [X] FR-001 · `apps/customer-app/lib/repositories/product.repository.test.ts`; contrato mock vs HTTP en `apps/customer-app/tests/integration/catalog.contract.test.ts`.
- [X] FR-002 · filtro de categoría en `apps/mobile-app/tests/e2e/walkthrough.spec.ts` ("la tienda lista productos y el filtro de categoría reduce la lista").
- [X] FR-003/004 · `apps/mobile-app/src/lib/cart.test.ts`; web en `apps/customer-app/tests/e2e/shop-checkout.spec.ts`.
- [X] FR-005 · catálogo sembrado en `apps/backend/test/app.e2e-spec.ts` ("products (seeded data)").
- [ ] Test unitario del carrito de la web (`cart.store.ts`): hoy solo lo cubre el e2e de compra.
