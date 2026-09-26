# Feature Specification: Venta de mostrador

**Feature Branch**: `033-counter-sale` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de la venta de productos en mostrador (branch-app) con inventario local por sucursal.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Cada sucursal tiene su stock físico; la venta de mostrador descuenta SOLO el de esa sucursal (regla de negocio, verificado en Postgres 2026-09-12).
- El precio lo pone el servidor desde el catálogo; nombres armados siempre igual (`nombre · sabor`).
- Formas de pago: efectivo, tarjeta (terminal, con crédito/débito desde el spec 009) y transferencia.
- Cada venta queda en el registro de cobros y tiene ticket con autofactura (spec 003).
- Errores tipados desde códigos del backend: `INSUFFICIENT_STOCK` (con el producto), `PRODUCT_NOT_FOUND`, `BRANCH_DOES_NOT_STOCK_PRODUCT`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vender productos (Priority: P1)

Mostrador arma el carrito con el inventario de su sucursal, cobra y descuenta stock.

**Independent Test**: `apps/backend/test/branch-ops.e2e-spec.ts` ("POST /branches/:id/counter-sales"); navegador con Postgres (2 Energy: 200 → 198, otras sucursales intactas).

**Acceptance Scenarios**:

1. **Given** stock 200 de un producto, **When** vende 2, **Then** queda 198 en esta sucursal y las demás no cambian.
2. **Given** un producto agotado, **When** intenta agregarlo, **Then** el + está deshabilitado.
3. **Given** más cantidad que el stock, **When** confirma, **Then** error "sin stock" con el nombre del producto.

### Edge Cases

- Dos cajas vendiendo el último producto: la segunda recibe `INSUFFICIENT_STOCK`.
- Un 500 del backend no se disfraza de "sin stock".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El inventario mostrado MUST ser el de la sucursal del staff.
- **FR-002**: Vender MUST descontar el stock local en la misma transacción que registra la venta y su cobro.
- **FR-003**: El total MUST calcularse en el servidor.
- **FR-004**: Los rechazos de negocio MUST llegar como errores tipados; los demás fallos pasan tal cual.

### Key Entities

- BranchInventoryLevel, CounterSale (+ ítems), Charge.

## Success Criteria *(mandatory)*

- **SC-001**: El stock de una sucursal nunca cambia por ventas de otra.

## Assumptions


## Fuera de alcance / pendiente conocido

- Devoluciones de mostrador (política sin decidir).
