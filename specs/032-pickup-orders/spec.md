# Feature Specification: Pedidos para recoger en sucursal

**Feature Branch**: `032-pickup-orders` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de la fila de pedidos "recoger en gym" en branch-app: buscarlos, entregarlos y cobrar el efectivo.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Es el MISMO `Order` que el socio hizo en la tienda: aparece en la fila de su sucursal y el socio lo ve entregado en su panel (2026-09-12).
- La fila solo lista pedidos cobrados o de efectivo pendiente: un checkout en línea abandonado (`pending_payment` de Stripe) no aparece y no se puede entregar (`ORDER_NOT_PAID`, 2026-09-15).
- Buscar por QR o folio (el QR de retiro es el id del pedido) con cámara o lector físico, y entregar ahí mismo.
- Entregar un pedido de efectivo lo cobra: entra al cajón (`ShiftTransaction` `pickup`) y al registro de cobros, por la fecha de entrega.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entregar un pedido (Priority: P1)

Mostrador escanea el QR del socio, ve el pedido y lo marca entregado.

**Independent Test**: `apps/backend/test/branch-ops.e2e-spec.ts` ("pickup orders (tienda → mostrador)"); navegador con Cognito real (2026-09-12).

**Acceptance Scenarios**:

1. **Given** un pedido listo, **When** escanea su QR, **Then** ve el pedido y "Marcar como entregado".
2. **Given** un pedido ya entregado, **When** lo busca, **Then** ve que ya se entregó.
3. **Given** un folio que no es de esta sucursal, **When** lo busca, **Then** "no encontrado".

### User Story 2 - Cobrar el efectivo al entregar (Priority: P1)

Un pedido de efectivo se cobra al entregarlo y aparece en el corte de caja.

**Independent Test**: `branch-ops.e2e-spec.ts`; `apps/backend/src/pickup-orders/pickup-orders.service.spec.ts`.

**Acceptance Scenarios**:

1. **Given** un pedido de efectivo de $2,080, **When** se entrega, **Then** el corte muestra "PEDIDO EN EFECTIVO · $2,080" y queda un cobro `cash`.

### Edge Cases

- Pedido en línea sin pagar: no aparece; forzar la entrega da 409 `ORDER_NOT_PAID`.
- Pedido a domicilio: `NOT_A_PICKUP_ORDER`.
- Entregar dos veces: `ORDER_ALREADY_DELIVERED`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La fila MUST listar solo los pedidos de recoger de la sucursal, cobrados o de efectivo pendiente.
- **FR-002**: Entregar MUST pasar el pedido a `done` con `deliveredAt`, y el socio lo MUST ver entregado.
- **FR-003**: Entregar un pedido de efectivo MUST registrar el cobro y la transacción de caja de esa sucursal.
- **FR-004**: La búsqueda MUST aceptar el QR/folio por cámara o lector físico.

### Key Entities

- PickupOrder (vista del Order para mostrador), ShiftTransaction `pickup`.

## Success Criteria *(mandatory)*

- **SC-001**: Ningún pedido sin pagar sale de la sucursal.

## Assumptions


## Fuera de alcance / pendiente conocido

