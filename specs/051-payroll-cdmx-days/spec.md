# Feature Specification: Días trabajados en el calendario de CDMX

**Feature Branch**: `051-payroll-cdmx-days`

**Created**: 2026-09-26

**Status**: Implemented (2026-09-26)

**Input**: Hallazgo del spec 050: la nómina cuenta el día trabajado por la fecha UTC de la entrada. Un turno que empieza después de las 18:00 de CDMX cuenta como del día siguiente, y el día 15 o el último del mes cae en la otra quincena.

## Clarifications

### Session 2026-09-26

- Q: ¿Qué día es un turno? → A: El día de CDMX en que empezó (la entrada), igual que una visita de socio (`visitDay`). Un turno de noche que cruza la medianoche es un día trabajado, el de su entrada.
- Q: ¿Y los límites de la quincena? → A: Son fechas solas (`DATE`, spec 050): un turno pertenece a la quincena si su día de CDMX está entre `startDate` y `endDate`, inclusive. Sin horas, ya no hace falta el "fin del día en UTC" que se usaba para no recortar el último día.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El turno de la tarde cuenta en su día (Priority: P1) 🎯 MVP

**Independent Test**: unit de `getAttendanceSummaries` con entradas a las 19:00 y 21:00 de CDMX en los bordes de quincena.

**Acceptance Scenarios**:

1. **Given** una entrada el 15 de agosto a las 19:00 de CDMX (16 de agosto 01:00 UTC), **When** se cuentan los días de la quincena del 16 al 31, **Then** no cuenta: es de la quincena del 1 al 15.
2. **Given** una entrada el 31 de agosto a las 21:00 de CDMX (1 de septiembre 03:00 UTC), **When** se cuenta la quincena del 16 al 31, **Then** cuenta un día.
3. **Given** dos entradas el mismo día de CDMX que caen en dos días UTC distintos (10:00 y 20:00), **When** se cuentan, **Then** es un día trabajado, no dos.

### Edge Cases

- Turno que cruza la medianoche: cuenta el día de la entrada.
- Horario de verano: CDMX ya no lo usa; `America/Mexico_City` del sistema lo resuelve si cambiara.

## Requirements *(mandatory)*

- **FR-001**: El día trabajado MUST ser el día de CDMX de la entrada (`mexicoDay`).
- **FR-002**: Un turno MUST pertenecer a la quincena cuyo rango de fechas contiene ese día.
- **FR-003**: El e2e de asistencia → nómina MUST crear su periodo en el mes de CDMX, no el UTC, para no fallar de noche a fin de mes.

## Success Criteria *(mandatory)*

- **SC-001**: Ningún turno cambia de día ni de quincena por la hora a la que se fichó.

## Assumptions

- Los recibos ya emitidos no se recalculan (cerrar es final, spec 042): el arreglo aplica a las quincenas que se corran de aquí en adelante.
