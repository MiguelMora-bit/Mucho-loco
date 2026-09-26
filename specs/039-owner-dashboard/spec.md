# Feature Specification: Resumen de la cadena e inventario global

**Feature Branch**: `039-owner-dashboard` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo del resumen del panel del dueño: ingresos y clientes activos por sucursal, e inventario consolidado (Fase 1, de solo lectura).

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Las cifras se derivan de transacciones reales, no se guardan: ingresos del registro de cobros en la ventana (`?days=`, 30 por defecto), clientes activos = membresías activas o en gracia (en gracia siguen entrando).
- Siempre las 15 sucursales, aunque no tengan movimiento (en cero).
- El inventario global suma el stock de cada sucursal en cada lectura: una transferencia nunca deja el total desincronizado.
- Desde los specs 014 y 020 el resumen también muestra afluencia (entradas de hoy y del periodo) y alertas de QR compartido.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver la cadena de un vistazo (Priority: P1)

El dueño ve ingresos totales, clientes activos y entradas de hoy, y el desglose por sucursal.

**Independent Test**: `branch-ops.e2e-spec.ts` ("owner stats list every branch, deriving revenue instead of hardcoding it"); navegador con datos reales (2026-09-12 y 2026-09-26).

**Acceptance Scenarios**:

1. **Given** un cobro de $1,550 en Roma Sur, **When** el dueño abre el resumen, **Then** Roma Sur suma $1,550 y las otras 14 aparecen en cero.
2. **Given** un gerente, **When** pide las estadísticas de la cadena, **Then** 403.

### User Story 2 - Inventario consolidado (Priority: P2)

Stock total por producto sumando todas las sucursales.

**Independent Test**: `apps/owner-panel/src/lib/repositories/stats.repository.test.ts` (suma por producto); `branch-ops.e2e-spec.ts` ("GET /inventory/global").

**Acceptance Scenarios**:

1. **Given** stock de whey en 3 sucursales, **When** ve el inventario global, **Then** ve la suma.

### Edge Cases

- Base recién sembrada: los importes son chicos (es el precio de que sean ciertos).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ingresos por sucursal MUST salir del registro de cobros en la ventana.
- **FR-002**: Clientes activos MUST contar membresías activas y en gracia.
- **FR-003**: MUST listarse las 15 sucursales.
- **FR-004**: El inventario global MUST sumarse en cada lectura.
- **FR-005**: Solo el dueño MUST ver el resumen.

### Key Entities

- BranchStatsSummary, GlobalInventoryItem.

## Success Criteria *(mandatory)*

- **SC-001**: Los números del resumen cuadran con las transacciones.

## Assumptions


## Fuera de alcance / pendiente conocido

- Filtrar el resumen por rango de fechas desde la pantalla (hoy la ventana es fija).
