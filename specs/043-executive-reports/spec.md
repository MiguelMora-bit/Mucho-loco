# Feature Specification: Reportes ejecutivos

**Feature Branch**: `043-executive-reports` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de `/reports` en owner-panel: estado de resultados por sucursal cruzando ingresos, gastos y nómina.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Cruza ingresos (`BranchStatsSummary`), gastos (`Expense`) y costo de nómina (`Payslip.grossPay`: las deducciones también son costo para el negocio) — antes vivía en tres pantallas sin cruzarse (2026-09-11).
- El cálculo es una función pura (`calculateExecutiveReport`) con su test; el store es el único que junta tres repositorios.
- Desglosa gastos por categoría a nivel compañía; los gastos corporativos no se asignan a una sucursal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver la utilidad por sucursal (Priority: P1)

El dueño ve ingresos, gastos, nómina y utilidad de cada sucursal, y los gastos por categoría.

**Independent Test**: `apps/owner-panel/src/lib/executiveReport.test.ts`.

**Acceptance Scenarios**:

1. **Given** ingresos, gastos y recibos de una sucursal, **When** abre Reportes, **Then** ve su utilidad = ingresos − gastos − nómina bruta.
2. **Given** una sucursal nueva sin datos, **When** abre Reportes, **Then** aparece en ceros sin romper el reporte.

### Edge Cases

- Gastos corporativos: se muestran aparte, no restan a una sucursal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La utilidad por sucursal MUST ser ingresos − gastos de la sucursal − nómina bruta de la sucursal.
- **FR-002**: MUST mostrarse el desglose de gastos por categoría.
- **FR-003**: El cálculo MUST ser puro y probado.

### Key Entities

- ExecutiveReport, BranchPnl.

## Success Criteria *(mandatory)*

- **SC-001**: La P&L cuadra con las tres fuentes.

## Assumptions


## Fuera de alcance / pendiente conocido

- Elegir el periodo del reporte desde la pantalla.
- Exportar el reporte.
