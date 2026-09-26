# Feature Specification: Nómina

**Feature Branch**: `042-payroll` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de `/payroll` en owner-panel: empleados, quincenas y recibos calculados con la asistencia real.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Quincenas `open`/`closed`; correr la nómina solo aplica a la abierta y la cierra (sin recálculo después).
- Los días trabajados salen de la asistencia que ficha branch-app (días distintos con turno cerrado, spec 038), no de un dato semilla (2026-09-12).
- El recibo lo emite y **guarda** el servidor con nombre, sucursal, puesto y sueldo congelados: es un documento histórico.
- ISR e IMSS son una aproximación **ilustrativa**, NO las tablas reales del SAT/IMSS (`payroll.math.ts`, gemelo de `owner-panel/src/lib/payroll.ts` para el mock).
- Los límites de la quincena se calculan en UTC (fecha sola), para no recortar el último día.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correr la quincena (Priority: P1)

El dueño ve empleados y días trabajados, corre la nómina y obtiene los recibos.

**Independent Test**: `branch-ops.e2e-spec.ts` ("attendance → payroll (sucursal → HQ)"); navegador (Luis fichó en branch-app y el recibo salió en owner-panel: $500 bruto, $13 IMSS, $487 neto, 2026-09-12).

**Acceptance Scenarios**:

1. **Given** una quincena abierta con asistencia fichada, **When** corre la nómina, **Then** se emiten recibos con bruto, ISR, IMSS y neto, y la quincena se cierra.
2. **Given** una quincena cerrada, **When** intenta correrla, **Then** `PERIOD_ALREADY_CLOSED`.
3. **Given** dos turnos el mismo día, **When** se calcula, **Then** cuentan como un día.

### Edge Cases

- Un turno sin cerrar no se paga.
- Quincena inexistente: `PERIOD_NOT_FOUND`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Los días trabajados MUST salir de la asistencia real con turno cerrado.
- **FR-002**: Correr la nómina MUST emitir y guardar recibos congelados y cerrar la quincena.
- **FR-003**: Una quincena cerrada MUST ser de solo lectura.
- **FR-004**: El cálculo MUST estar en una función pura probada.
- **FR-005**: Solo el dueño MUST ver y correr la nómina.

### Key Entities

- Employee (`email` liga con la asistencia), PayrollPeriod, Payslip (congelado), AttendanceSummary.

## Success Criteria *(mandatory)*

- **SC-001**: Lo pagado coincide con lo fichado.

## Assumptions

- Las tablas de ISR/IMSS son ilustrativas hasta que el contador dé las reales.

## Fuera de alcance / pendiente conocido

- Crear la siguiente quincena: hoy solo existen las sembradas (los tests crean las suyas en la base); cerrar la abierta deja la nómina sin quincena activa.
- Tablas reales de ISR e IMSS.
- Alta y edición de empleados desde la pantalla.
