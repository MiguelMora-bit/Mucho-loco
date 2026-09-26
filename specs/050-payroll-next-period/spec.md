# Feature Specification: La nómina nunca se queda sin quincena

**Feature Branch**: `050-payroll-next-period`

**Created**: 2026-09-26

**Status**: Implemented (2026-09-26)

**Input**: User description: "Hueco del spec retroactivo 042: correr la nómina cierra la quincena abierta, pero no existe forma de crear la siguiente. Tras cerrar la quincena sembrada (16–31 ago), la nómina se detiene."

## Clarifications

### Session 2026-09-26

- Q: ¿Automática o a mano? → A: Las dos. Al correr la nómina, en la misma transacción se abre la quincena siguiente: la operación normal nunca se detiene. Y para cuando ya está detenida (no hay ninguna abierta, como hoy en cuanto se cierre la sembrada), el dueño tiene "Abrir siguiente quincena".
- Q: ¿Cómo se calcula la siguiente? → A: Empieza el día siguiente al fin de la última; termina el 15 si empieza en la primera mitad del mes, o el último día del mes si empieza después del 15. Así 1–15 → 16–fin de mes → 1–15 del siguiente, y una quincena irregular (p. ej. de mes completo) se corrige sola. Sin ninguna quincena, la que contiene hoy (hora de CDMX).
- Q: ¿Duplicados? → A: Índice único por fecha de inicio en la base; "abrir siguiente" con una quincena ya abierta responde 409 `PERIOD_ALREADY_OPEN`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correr la nómina abre la siguiente (Priority: P1) 🎯 MVP

**Independent Test**: e2e — correr la quincena del 16 al 31 cierra esa y deja abierta la del 1 al 15 del mes siguiente, con sus días correctos; owner-panel (mock) muestra la nueva quincena abierta tras correr.

**Acceptance Scenarios**:

1. **Given** la quincena del 16 al 31 de agosto abierta, **When** el dueño corre la nómina, **Then** queda cerrada y aparece abierta la del 1 al 15 de septiembre (15 días).
2. **Given** la del 1 al 15, **When** se corre, **Then** se abre la del 16 al 30 (15 días) o al 31 según el mes.
3. **Given** que ya existe una quincena posterior, **When** se corre, **Then** no se crea otra.

### User Story 2 - Destrabar una nómina detenida (Priority: P1)

**Acceptance Scenarios**:

1. **Given** ninguna quincena abierta, **When** el dueño pulsa "Abrir siguiente quincena", **Then** se abre la que sigue a la última.
2. **Given** una quincena abierta, **When** se pide abrir otra, **Then** 409 `PERIOD_ALREADY_OPEN`.
3. **Given** un gerente, **When** lo intenta, **Then** 403.

### Edge Cases

- Febrero: la segunda quincena termina el 28 o 29.
- Diciembre: la siguiente de la del 16 al 31 es la del 1 al 15 de enero del año siguiente.
- Sin ninguna quincena en la base: se abre la que contiene hoy en CDMX.

## Requirements *(mandatory)*

- **FR-001**: Correr la nómina MUST cerrar la quincena y abrir la siguiente en la misma transacción, salvo que ya exista una posterior.
- **FR-002**: `POST /payroll/periods/next` (dueño) MUST abrir la siguiente a la última, o 409 si ya hay una abierta.
- **FR-003**: El cálculo de la siguiente MUST ser una función pura probada (1–15 / 16–fin de mes, cambio de mes y de año).
- **FR-004**: La base MUST impedir dos quincenas con la misma fecha de inicio.
- **FR-005**: owner-panel MUST ofrecer "Abrir siguiente quincena" cuando no hay ninguna abierta (mock y HTTP).

## Success Criteria *(mandatory)*

- **SC-001**: Después de cualquier corrida de nómina siempre hay una quincena abierta.

## Assumptions

- "Abrir siguiente" abre la que sigue a la ÚLTIMA, aunque haya quedado atrás del calendario: cada quincena se paga, ninguna se salta.
- Una quincena corrida con otras fechas (como la de mes completo del e2e) no rompe el ciclo: la siguiente vuelve a cerrar el 15 o a fin de mes.

## Hallazgo fuera de alcance

- `getAttendanceSummaries` cuenta el día trabajado por la fecha UTC de la entrada: un turno que empieza después de las 18:00 de CDMX cuenta como del día siguiente, y el día 15 o el último del mes cae en la otra quincena. Anotado en `specs/README.md`.
