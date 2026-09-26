# Feature Specification: Checkout y pedidos de la tienda

**Feature Branch**: `023-checkout-and-orders` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo del checkout de la tienda (web y móvil) y del ciclo de vida de un pedido en el backend.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Pago en línea con **Stripe Checkout Sessions**, sin fijar `payment_method_types`: Stripe ofrece tarjeta, OXXO y SPEI según el socio (2026-09-12).
- El pedido se guarda en `pending_payment` ANTES de mandar a pagar; la entrega la dispara el **webhook**, nunca la página de éxito. Se exige `payment_status` pagado y se escuchan `async_payment_succeeded/failed` (OXXO/SPEI).
- Idempotencia: `providerSessionId` único y `markPaid` no hace nada si ya estaba pagado.
- **El total lo calcula el servidor** (precio de `Product` × cantidad, + `HOME_SHIPPING_FEE` de $99 a domicilio); el cliente solo manda `{ productId, qty }` + `lang`.
- Efectivo solo con "recoger en gym" (2026-09-08); transferencia manual, Mercado Pago y PayPal se quitaron (2026-09-14) porque creaban pedidos pagados sin cobrar.
- A domicilio exige dirección (`ShippingAddress`: calle, colonia, alcaldía/municipio, estado, CP de 5 dígitos, teléfono E.164, referencias), congelada en el pedido (2026-09-14).
- "Recoger en gym" exige membresía: la sucursal sale de ella (`PICKUP_REQUIRES_MEMBERSHIP`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pagar en línea (Priority: P1)

El socio paga su carrito con Stripe (tarjeta, OXXO o SPEI) y el pedido queda listo cuando Stripe confirma.

**Independent Test**: `apps/backend/test/payments.e2e-spec.ts` (Stripe sobreescrito, Postgres real); probado contra el sandbox de Stripe el 2026-09-12.

**Acceptance Scenarios**:

1. **Given** un carrito de 2 × $1,290, **When** paga con tarjeta, **Then** el pedido se crea en `pending_payment` con total $2,580 calculado por el servidor y pasa a `ready` con el webhook.
2. **Given** un pago con OXXO, **When** Stripe manda `checkout.session.completed` sin pagar, **Then** el pedido sigue pendiente hasta `async_payment_succeeded`.
3. **Given** el mismo evento reentregado, **When** llega otra vez, **Then** no pasa nada nuevo.

### User Story 2 - Efectivo al recoger (Priority: P1)

El socio con membresía aparta su pedido y lo paga en la sucursal.

**Independent Test**: `apps/customer-app/app/api/orders/route.test.ts`; `apps/backend/src/users/users.service.spec.ts`.

**Acceptance Scenarios**:

1. **Given** entrega "recoger en gym", **When** elige efectivo, **Then** el pedido nace en `pending_payment` y lo cobra mostrador (spec 032).
2. **Given** entrega a domicilio, **When** intenta efectivo, **Then** la opción no aparece y el servidor responde 400.

### User Story 3 - Ver mis pedidos (Priority: P2)

El socio ve sus pedidos con estado, total y, si recoge, el QR de retiro.

**Independent Test**: `shop-checkout.spec.ts` (el pedido aparece en el panel) y walkthrough del móvil.

**Acceptance Scenarios**:

1. **Given** un pedido para recoger listo, **When** abre su detalle, **Then** ve el QR de retiro (el id del pedido).
2. **Given** un pedido a domicilio, **When** abre su detalle, **Then** ve "SE ENVÍA A" con la dirección, sin QR.

### Edge Cases

- Checkout abandonado: el pedido queda en `pending_payment` y mostrador no lo ve ni lo entrega (`ORDER_NOT_PAID`).
- Un campo extra en el body (p. ej. un `total`) se rechaza con 400 (`forbidNonWhitelisted`).
- Producto inexistente en el pedido: 400/404 tipado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El cliente MUST mandar solo líneas `{ productId, qty }`, la entrega (`OrderDelivery`) y `lang`; nunca precios ni total.
- **FR-002**: El servidor MUST calcular el total desde el catálogo y agregar $99 a domicilio.
- **FR-003**: El pago en línea MUST pasar por Stripe Checkout; el pedido MUST quedar `ready` solo por el webhook con la firma verificada.
- **FR-004**: Efectivo MUST aceptarse solo con recoger en sucursal.
- **FR-005**: Un pedido a domicilio MUST llevar una dirección válida; se congela en el pedido y viaja a Stripe (`payment_intent_data.shipping`).
- **FR-006**: Recoger en gym MUST exigir membresía.
- **FR-007**: El socio MUST ver sus pedidos (`GET /users/me/orders`) con estado (`pending_payment`, `ready`, `shipped`, `done`), fecha ISO, total y, si aplica, guía de envío.

### Key Entities

- Order (items con nombre/precio congelados, `delivery`, `shippingAddress`, `status`, `total`), Payment (intentos de pago del pedido).

## Success Criteria *(mandatory)*

- **SC-001**: 0 pedidos pagados sin cobro de por medio.
- **SC-002**: El total cobrado siempre coincide con el calculado por el servidor.

## Assumptions

- Los métodos OXXO/SPEI deben estar activados en el dashboard de Stripe.

## Fuera de alcance / pendiente conocido

- PayPal y Mercado Pago (el modelo `Payment` ya tiene `provider`).
- Reembolsos (depende de la política de devoluciones, sin decidir).
