# Feature Specification: Crédito o débito en los cobros con tarjeta de mostrador

**Feature Branch**: `009-counter-card-type`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Pendiente en apps/backend/CLAUDE.md: mostrador registra 'tarjeta' sin distinguir crédito de débito, y el SAT los distingue en la forma de pago del CFDI (04 vs 28). Hoy se factura todo como 04, provisional."

## Clarifications

### Session 2026-09-25

- Q: ¿Quién decide si fue crédito o débito? → A: El staff, al cobrar: la terminal lo muestra en su ticket. Al elegir "tarjeta" en mostrador aparece "¿Crédito o débito?" y es obligatorio.
- Q: ¿Cambia el corte de caja? → A: No: el corte sigue sumando "tarjeta" en un solo renglón (cuadra con el cierre de la terminal). La distinción vive en el registro de cobros, que es de donde sale la factura.
- Q: ¿Y un cliente viejo que no manda el tipo? → A: El backend lo acepta y lo registra como "tarjeta" sin tipo (forma de pago 04 provisional, como hoy).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar el tipo de tarjeta al cobrar (Priority: P1) 🎯 MVP

Al cobrar con tarjeta en mostrador (venta, alta o renovación), el staff elige crédito o débito; la factura de ese cobro sale con la forma de pago correcta.

**Independent Test**: vender con tarjeta de débito → el cobro registrado queda `card_debit` (forma de pago 28); sin elegir tipo, no se puede confirmar.

**Acceptance Scenarios**:

1. **Given** el método "tarjeta", **When** el staff no elige crédito/débito, **Then** no puede confirmar el cobro.
2. **Given** una venta con tarjeta de débito, **When** se confirma, **Then** el cobro queda como débito y su recibo fiscal lleva forma de pago 28.
3. **Given** una renovación con tarjeta de crédito, **When** se confirma, **Then** el cobro queda como crédito (04).
4. **Given** efectivo o transferencia, **When** se cobra, **Then** no se pregunta el tipo.

### Edge Cases

- Un cliente HTTP que no manda el tipo: se acepta como "tarjeta" (04 provisional).
- Un tipo mandado con efectivo o transferencia: se ignora.
- El corte de caja no cambia.

## Requirements *(mandatory)*

- **FR-001**: Con método "tarjeta", mostrador MUST pedir crédito o débito antes de confirmar (venta, alta y renovación).
- **FR-002**: El backend MUST guardar el tipo en la venta/pago y registrar el cobro como `card_credit` o `card_debit`.
- **FR-003**: Sin tipo, el backend MUST seguir aceptando el cobro como `card`.
- **FR-004**: El corte de caja MUST seguir sumando tarjeta en un solo renglón.
- **FR-005**: Mock y backend iguales; textos es/en.

## Success Criteria *(mandatory)*

- **SC-001**: El 100% de los cobros con tarjeta hechos desde branch-app quedan con tipo (crédito o débito).

## Assumptions

- El mapeo `card_credit → 04`, `card_debit → 28` ya existe en `PAYMENT_FORM` (facturación, spec del backend).
