# Feature Specification: Corregir gastos

**Feature Branch**: `054-expense-corrections`

**Created**: 2026-09-26

**Status**: Implemented (2026-09-26)

**Input**: Hueco del spec retroactivo 041: un gasto capturado mal no se puede editar ni borrar, y pesa en la P&L de los reportes ejecutivos para siempre. Revisando la pantalla salieron tres defectos más: la fecha no se captura (el backend pone "ahora" en UTC, así que un gasto de la noche cae al día siguiente), el monto acepta centavos que el backend rechaza con un error genérico, y la lista se ordena distinto en mock y en backend.

## Clarifications

### Session 2026-09-26

- Q: ¿Borrar o anular? → A: Borrar. El único que captura gastos es el dueño y un gasto mal capturado no es un documento fiscal; la P&L debe dejar de contarlo. Con confirmación en la pantalla.
- Q: ¿Qué se edita? → A: Todo lo capturado: sucursal (o corporativo), categoría, concepto, monto y fecha. Mismo formulario que el alta, en modo edición.
- Q: ¿Fecha? → A: Se captura (default hoy en CDMX), no puede ser futura, y se guarda como fecha sola (`DATE`), igual que las quincenas (spec 050). Al editar sin fecha se conserva la que tenía.
- Q: ¿Monto? → A: Pesos enteros, como el resto del sistema de sucursal y HQ. La pantalla no ofrece centavos.
- Q: ¿Orden? → A: Del más reciente al más viejo por fecha, igual en mock y backend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Corregir un gasto (Priority: P1) 🎯 MVP

**Independent Test**: e2e — editar monto, sucursal y fecha de un gasto; borrar otro; 404 `EXPENSE_NOT_FOUND` al tocar uno inexistente; fecha futura → 400. owner-panel (mock): editar y borrar desde la lista.

**Acceptance Scenarios**:

1. **Given** un gasto de $12,000 de renta en Roma Sur, **When** el dueño lo edita a $1,200, **Then** la lista y el total muestran $1,200.
2. **Given** un gasto duplicado, **When** lo borra y confirma, **Then** desaparece y el total baja.
3. **Given** que otro dispositivo ya lo borró, **When** intenta editarlo, **Then** ve "ese gasto ya no existe" y la lista se actualiza.

### User Story 2 - Capturar la fecha real (Priority: P2)

**Acceptance Scenarios**:

1. **Given** el formulario, **When** lo abre, **Then** la fecha viene en hoy (CDMX) y no deja elegir una futura.
2. **Given** un gasto del día anterior, **When** lo registra con esa fecha, **Then** queda con esa fecha.

### Edge Cases

- Monto con centavos, cero o negativo: la pantalla no deja guardar; el backend responde 400.
- Fecha inválida (`2026-02-30`) o futura: 400.
- Concepto vacío: 400.

## Requirements *(mandatory)*

- **FR-001**: `PUT /expenses/:id` MUST reemplazar sucursal, categoría, concepto, monto y (si viene) fecha; `DELETE /expenses/:id` MUST borrarlo (204). Inexistente → 404 `EXPENSE_NOT_FOUND`. Solo dueño.
- **FR-002**: El alta MUST aceptar fecha opcional (default hoy CDMX); ninguna fecha MUST ser futura.
- **FR-003**: `expenses.date` MUST ser `DATE`.
- **FR-004**: owner-panel MUST editar y borrar (con confirmación) desde la lista, con mock y HTTP, y `ExpenseNotFoundError` tipado.
- **FR-005**: La lista MUST ordenarse por fecha descendente en los dos modos y el monto MUST ser entero.

## Success Criteria *(mandatory)*

- **SC-001**: Un gasto mal capturado se corrige o se quita sin tocar la base a mano, y la P&L lo refleja.

## Fuera de alcance

- Historial de cambios de un gasto (quién lo cambió y cuándo).
- Adjuntar comprobante.
