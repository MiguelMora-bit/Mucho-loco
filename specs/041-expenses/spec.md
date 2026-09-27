# Feature Specification: Gastos

**Feature Branch**: `041-expenses` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de `/expenses` en owner-panel: registrar y listar gastos por sucursal o corporativos.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Un gasto es de una sucursal (`branchId`) o corporativo (`branchId: null`: marketing nacional, oficina).
- Seis categorías: renta, servicios, mantenimiento, insumos, marketing y otro.
- La fecha viaja como fecha sola en ISO y se formatea al pintar.
- Los gastos alimentan la P&L de los reportes ejecutivos (spec 043).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar un gasto (Priority: P1)

El dueño captura concepto, monto, categoría, fecha y sucursal (o corporativo).

**Independent Test**: `branch-ops.e2e-spec.ts` ("expenses"); `apps/owner-panel/src/lib/repositories/expenses.repository.test.ts`.

**Acceptance Scenarios**:

1. **Given** un gasto de renta de Roma Sur, **When** lo registra, **Then** aparece en la lista con su categoría y sucursal.
2. **Given** un gasto corporativo, **When** lo registra, **Then** viaja con `branchId: null` y no se asigna a ninguna sucursal.

### Edge Cases

- Categoría fuera de las 6: 400.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El gasto MUST tener categoría válida, monto, fecha ISO y sucursal opcional.
- **FR-002**: La lista MUST mostrarse con fecha en el idioma elegido.
- **FR-003**: Solo el dueño MUST registrar gastos.

### Key Entities

- Expense (`category`, `amount`, `date`, `branchId?`, `description`).

## Success Criteria *(mandatory)*

- **SC-001**: Todo gasto queda asignado a una sucursal o como corporativo.

## Assumptions


## Fuera de alcance / pendiente conocido

- ~~Editar o borrar un gasto~~ ✅ spec 054 (2026-09-26).
- Adjuntar comprobante.
