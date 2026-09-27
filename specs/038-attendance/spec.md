# Feature Specification: Asistencia del personal

**Feature Branch**: `038-attendance` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de `/attendance` en branch-app: cada empleado ficha su entrada y salida, y lo fichado paga la nómina (spec 042).

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Cualquier staff ficha su propia entrada y salida; el gerente además ve la asistencia del equipo de hoy (2026-09-11).
- A lo más una entrada abierta por persona, garantizado por un índice único parcial (`attendance_entries_one_open_per_staff`).
- La asistencia que ficha branch-app es la que usa la nómina de owner-panel: `daysWorked` cuenta días distintos con turno cerrado (2026-09-12).
- "Hoy" depende de la hora de CDMX (el contenedor corre con `TZ=America/Mexico_City`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fichar entrada y salida (Priority: P1)

El empleado registra su entrada al llegar y su salida al irse.

**Independent Test**: `branch-ops.e2e-spec.ts` ("attendance → payroll"); `apps/backend/src/attendance/attendance.service.spec.ts`; navegador (2026-09-12).

**Acceptance Scenarios**:

1. **Given** sin entrada abierta, **When** ficha entrada, **Then** queda abierta a su nombre.
2. **Given** con entrada abierta, **When** intenta otra, **Then** `ALREADY_CLOCKED_IN`.
3. **Given** sin entrada abierta, **When** ficha salida, **Then** `NO_OPEN_ENTRY`.

### User Story 2 - El equipo de hoy (Priority: P2)

El gerente ve quién ha entrado y salido hoy en su sucursal.

**Independent Test**: `apps/branch-app/src/lib/repositories/attendance.repository.test.ts`.

**Acceptance Scenarios**:

1. **Given** entradas de hoy, **When** el gerente abre Asistencia, **Then** ve al equipo con horas de entrada y salida.

### Edge Cases

- Entrar y salir dos veces el mismo día cuenta un día trabajado.
- Turno sin cerrar no cuenta para la nómina.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada empleado MUST poder fichar solo su propia entrada/salida.
- **FR-002**: MUST haber a lo más una entrada abierta por persona (en la base).
- **FR-003**: El gerente MUST ver la asistencia de hoy de su sucursal.
- **FR-004**: La nómina MUST contar días distintos con turno cerrado.

### Key Entities

- AttendanceEntry (`clockIn`, `clockOut`, `employeeId`/`staffEmail`, `branchId`).

## Success Criteria *(mandatory)*

- **SC-001**: Lo que se paga en nómina es lo que se fichó.

## Assumptions

- El correo del staff liga la asistencia con el empleado de nómina (`Employee.email`).

## Fuera de alcance / pendiente conocido

- ~~Correcciones de asistencia por el gerente (olvidos de salida)~~ ✅ spec 055 (2026-09-26).
