# Feature Specification: Transferencias de inventario entre sucursales

**Feature Branch**: `040-inventory-transfers` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de `/transfers` en owner-panel: mover stock de una sucursal a otra.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Valida sucursal origen ≠ destino y stock suficiente en origen antes de mover (Fase 2).
- Si el destino no tenía el producto, abre un nivel nuevo: no se exige que todas las sucursales carguen todo el catálogo.
- Con backend, descontar del origen, sumar al destino y registrar el movimiento ocurre en una sola transacción.
- Errores tipados: `SAME_BRANCH_TRANSFER` → `SameBranchError`; `INSUFFICIENT_STOCK` o `BRANCH_DOES_NOT_STOCK_PRODUCT` → `InsufficientStockError`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mover stock (Priority: P1)

El dueño elige producto, origen, destino y cantidad, y ve el historial.

**Independent Test**: `branch-ops.e2e-spec.ts` ("POST /inventory/transfers"); navegador (5 Shaker de Roma Sur a Roma Norte: 120→115 y 80→85, 2026-09-12).

**Acceptance Scenarios**:

1. **Given** 120 en Roma Sur y 80 en Roma Norte, **When** transfiere 5, **Then** quedan 115 y 85, con el movimiento en el historial.
2. **Given** misma sucursal de origen y destino, **When** transfiere, **Then** error de sucursal repetida.
3. **Given** más de lo que hay en origen, **When** transfiere, **Then** error de stock insuficiente.

### Edge Cases

- Destino sin nivel del producto: se crea.
- Otras sucursales no cambian.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La transferencia MUST validar origen distinto de destino y stock suficiente.
- **FR-002**: MUST ser atómica (origen, destino y registro juntos).
- **FR-003**: MUST crear el nivel en destino si no existía.
- **FR-004**: El historial MUST listar cada movimiento.
- **FR-005**: Solo el dueño MUST transferir.

### Key Entities

- InventoryTransfer, BranchInventoryLevel.

## Success Criteria *(mandatory)*

- **SC-001**: El total de la cadena no cambia con una transferencia.

## Assumptions


## Fuera de alcance / pendiente conocido

- Transferencias desde la bodega central (hoy entre sucursales).
