# Feature Specification: Envíos a domicilio desde la bodega

**Feature Branch**: `044-home-shipments` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de `/shipments` en owner-panel: preparar, enviar y entregar los pedidos a domicilio (2026-09-14).

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Los envíos salen de una bodega central única que hoy opera HQ (no existe un rol de bodega).
- Solo se listan pedidos a domicilio **cobrados** (`ready`/`shipped`/`done`): mandar uno en `pending_payment` sería regalarlo.
- Estados: por enviar → en camino (con guía opcional y `shippedAt`) → entregado (`deliveredAt`); nuevo estado `shipped` en el pedido.
- El socio ve "EN CAMINO" y la guía en su panel, y recibe el aviso de WhatsApp `pedido_en_camino` (spec 008).
- Errores con código: `ORDER_NOT_PAID`, `ORDER_ALREADY_SHIPPED`, `ORDER_NOT_SHIPPED`, `ORDER_ALREADY_DELIVERED`, `NOT_A_HOME_ORDER` → `ShipmentStateError` en owner-panel (la pantalla relee la lista).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enviar y entregar (Priority: P1)

El dueño ve por enviar, en camino y entregados; marca enviado (con guía) y luego entregado.

**Independent Test**: `branch-ops.e2e-spec.ts` ("shipments (tienda → bodega)"); `apps/owner-panel/src/lib/repositories/shipments.repository.test.ts`.

**Acceptance Scenarios**:

1. **Given** un pedido cobrado a domicilio, **When** lo marca enviado con guía, **Then** pasa a en camino y el socio ve la guía.
2. **Given** un pedido en camino, **When** lo marca entregado, **Then** pasa a entregado.
3. **Given** un pedido sin pagar, **When** se intenta enviar, **Then** `ORDER_NOT_PAID` (y no aparece en la lista).

### Edge Cases

- Dos pestañas con la lista vieja: el error de estado recarga la lista.
- Un pedido de recoger no es un envío.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La lista MUST incluir solo pedidos a domicilio cobrados, el más viejo primero, con dirección y teléfono.
- **FR-002**: Las transiciones MUST ser por enviar → en camino → entregado, rechazando saltos.
- **FR-003**: Marcar enviado MUST aceptar una guía opcional y avisar al socio.
- **FR-004**: Solo el dueño MUST operar envíos.

### Key Entities

- ShipmentOrder (vista del Order con socio y dirección).

## Success Criteria *(mandatory)*

- **SC-001**: Ningún pedido sin pagar sale de bodega.

## Assumptions


## Fuera de alcance / pendiente conocido

- Rol de bodega si la opera alguien que no sea el dueño.
- Integración con paquetería (guía automática).
