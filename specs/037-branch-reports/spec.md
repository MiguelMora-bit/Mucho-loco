# Feature Specification: Reportes e inventario local del gerente

**Feature Branch**: `037-branch-reports` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de `/reports` en branch-app: tendencia de ventas de la sucursal e inventario local con alerta de stock bajo.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Solo gerente. Distinto del corte de caja: el corte es por turno para cuadrar el cajón; el reporte es tendencia sin importar turnos (2026-09-11).
- Ventana de 7 días por defecto (`?days=`); ingresos, transacciones, desglose por día y los 5 productos más vendidos.
- Desde el registro de cobros (2026-09-14) los ingresos incluyen membresías y pedidos pagados en línea de la sucursal; "más vendidos" sigue saliendo de ventas de mostrador.
- Stock bajo = menos de 15 piezas (`LOW_STOCK_THRESHOLD`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver cómo va mi sucursal (Priority: P1)

El gerente ve ingresos y ventas de la semana y qué productos se venden más.

**Independent Test**: `branch-ops.e2e-spec.ts` ("reports": el reporte suma exactamente lo del registro de cobros de la sucursal); `apps/branch-app/src/lib/reports.test.ts`.

**Acceptance Scenarios**:

1. **Given** ventas de la semana, **When** abre Reportes, **Then** ve ingresos, transacciones, días y top 5.
2. **Given** mostrador (staff), **When** intenta abrir Reportes, **Then** no puede (403 en el backend).

### User Story 2 - Inventario local (Priority: P2)

El gerente ve el stock de su sucursal con los productos en stock bajo marcados.

**Independent Test**: `reports.test.ts` (`isLowStock`).

**Acceptance Scenarios**:

1. **Given** un producto con 10 piezas, **When** ve el inventario, **Then** aparece marcado como stock bajo.

### Edge Cases

- Semana sin ventas: el reporte carga en ceros.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El reporte MUST ser solo para gerente.
- **FR-002**: Los ingresos MUST salir del registro de cobros de la sucursal en la ventana.
- **FR-003**: El cálculo MUST ser una función pura probada.
- **FR-004**: El inventario MUST marcar stock bajo por debajo de 15.

### Key Entities

- BranchSalesReport, BranchInventoryLevel.

## Success Criteria *(mandatory)*

- **SC-001**: Los ingresos del reporte cuadran con el registro de cobros.

## Assumptions


## Fuera de alcance / pendiente conocido

- Umbral de stock bajo configurable por producto o sucursal.
