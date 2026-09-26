# Feature Specification: Caja: turnos y corte

**Feature Branch**: `034-cash-register` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo del corte de caja por turno en branch-app, auditable desde HQ.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- A lo más un turno abierto por sucursal, garantizado por un índice único parcial en Postgres (`cash_register_shifts_one_open_per_branch`); si dos requests compiten, la que pierde relee el que ganó.
- Pedir el turno abierto lo crea si no hay; cerrar es final (no se reabre).
- El corte suma lo que entró al CAJÓN en la ventana del turno: ventas, pagos de membresía y pedidos de efectivo entregados (`kind: pickup`, por fecha de entrega). Un pedido pagado en línea no entra.
- Totales por forma de pago (efectivo, tarjeta, transferencia); tarjeta en un solo renglón para cuadrar con el cierre de la terminal (spec 009).
- Solo gerente (`RequireManager` y `@Roles(manager)`). Desde el corte se reimprime el ticket de cada cobro (spec 003).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cuadrar el cajón (Priority: P1)

El gerente ve las transacciones del turno y sus totales por forma de pago, y cierra el turno.

**Independent Test**: `apps/backend/test/branch-ops.e2e-spec.ts` ("cash register"); `apps/branch-app/src/lib/cashRegister.test.ts`.

**Acceptance Scenarios**:

1. **Given** un turno con ventas en efectivo y tarjeta, **When** abre el corte, **Then** ve cada transacción y los totales por forma de pago.
2. **Given** el turno, **When** lo cierra, **Then** queda cerrado y el siguiente se crea al pedir el turno abierto.
3. **Given** un turno ya cerrado, **When** intenta cerrarlo otra vez, **Then** `SHIFT_ALREADY_CLOSED`.

### Edge Cases

- Dos requests abren turno al mismo tiempo: queda uno solo.
- Mostrador (staff) no ve la caja.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: MUST existir a lo más un turno abierto por sucursal.
- **FR-002**: El corte MUST incluir ventas, membresías de mostrador y efectivo de pedidos entregados en la ventana del turno.
- **FR-003**: Los totales MUST agruparse por forma de pago con una función pura probada.
- **FR-004**: Cerrar MUST ser final.
- **FR-005**: La caja MUST ser solo para gerente.

### Key Entities

- CashRegisterShift (`open`/`closed`), ShiftTransaction (`sale`, `membership`, `pickup`).

## Success Criteria *(mandatory)*

- **SC-001**: El corte cuadra con lo que entró físicamente al cajón.

## Assumptions

- Una caja por sucursal.

## Fuera de alcance / pendiente conocido

- Varias cajas por sucursal.
- Auditoría del corte desde owner-panel (hoy HQ ve ingresos agregados, no los cortes).
