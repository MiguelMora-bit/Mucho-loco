# Feature Specification: Corregir una salida olvidada

**Feature Branch**: `055-attendance-corrections`

**Created**: 2026-09-26

**Status**: Implemented (2026-09-26)

**Input**: Hueco del spec retroactivo 038: si alguien olvida fichar su salida, su turno queda abierto para siempre. Al día siguiente no puede fichar entrada (`ALREADY_CLOCKED_IN`) y el día que sí trabajó no se paga (la nómina cuenta turnos cerrados, spec 042). El gerente solo ve la asistencia de hoy y no puede hacer nada.

## Clarifications

### Session 2026-09-26

- Q: ¿Qué corrige el gerente? → A: Solo la salida de un turno que quedó abierto: captura la hora real a la que se fue. Editar entradas o turnos ya cerrados queda fuera (no es el caso que traba la operación).
- Q: ¿Qué turnos ve? → A: "Turnos sin salida": los abiertos de su sucursal que empezaron **antes de hoy** (CDMX), el más viejo primero. Uno de hoy es alguien trabajando — ya aparece "En turno" en la asistencia del día; listarlo como olvidado era ruido (salió en el recorrido: la gerente aparecía en la lista al fichar su propia entrada).
- Q: ¿Qué hora es válida? → A: Después de la entrada, no en el futuro y a lo más 24 h después de la entrada (un turno más largo es otro error de captura). Si no, 400 `INVALID_CLOCK_OUT`.
- Q: ¿Se nota que fue corregida? → A: Sí. Se guarda quién corrigió y cuándo (del token) y viaja en `AttendanceEntry.correctedBy`. Al guardar, el gerente ve la confirmación ("Salida de Itzel guardada (…). Ese día ya cuenta para la nómina.") y, si el turno era de hoy, la tabla del día lo marca "salida corregida por Ana". La nómina paga ese día como cualquier turno cerrado.
- Q: ¿Carreras? → A: El cierre es condicional a que siga abierto: si el empleado fichó su salida mientras tanto, 400 `ENTRY_ALREADY_CLOSED` y la lista se recarga.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Destrabar al que olvidó su salida (Priority: P1) 🎯 MVP

**Independent Test**: e2e — un turno abierto de ayer aparece en `GET /branches/:id/attendance/forgotten-entries`; el gerente lo cierra con la hora real; el empleado ya puede fichar entrada; la nómina cuenta ese día; mostrador → 403.

**Acceptance Scenarios**:

1. **Given** Luis fichó entrada ayer a las 07:00 y no salida, **When** el gerente abre Asistencia, **Then** lo ve en "Turnos sin salida".
2. **Given** ese turno, **When** el gerente captura la salida a las 15:00 de ayer, **Then** el turno se cierra, queda marcado como corregido por el gerente, y Luis puede fichar entrada hoy.
3. **Given** una hora antes de la entrada, en el futuro o más de 24 h después, **When** la guarda, **Then** 400 `INVALID_CLOCK_OUT` y el turno sigue abierto.

### Edge Cases

- El empleado ficha su salida mientras el gerente corrige: `ENTRY_ALREADY_CLOSED`.
- Turno inexistente: 404 `ENTRY_NOT_FOUND`.

## Requirements *(mandatory)*

- **FR-001**: `GET /branches/:branchId/attendance/forgotten-entries` (gerente) MUST listar los turnos abiertos de la sucursal que empezaron antes de hoy (CDMX), el más viejo primero.
- **FR-002**: `POST /attendance/entries/:id/close { clockOut }` (gerente) MUST cerrar con esa hora si es válida, guardando `correctedBy`/`correctedAt` del token.
- **FR-003**: `AttendanceEntry` MUST exponer `correctedBy` (`null` si la salida la fichó el empleado).
- **FR-004**: branch-app MUST mostrar "Turnos sin salida" al gerente con captura de la hora (mock y HTTP) y marcar las salidas corregidas.

## Success Criteria *(mandatory)*

- **SC-001**: Una salida olvidada ya no traba el día siguiente ni deja de pagarse, y cada corrección dice quién la hizo.

## Fuera de alcance

- Editar entradas o turnos cerrados; historial de cambios más allá de la última corrección.
- Ligar al gerente con su sucursal en el backend (mismo hueco que el spec 052).
