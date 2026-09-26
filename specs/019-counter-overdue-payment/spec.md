# Feature Specification: Pagar en mostrador el atraso de una suscripción

**Feature Branch**: `019-counter-overdue-payment`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Pendiente del spec 006: un socio en periodo de gracia con suscripción de Stripe (su tarjeta falló) no puede pagar en mostrador — la renovación responde MEMBER_RENEWS_ONLINE. Si trae efectivo, hoy la única salida es que pague en línea con otra tarjeta."

## Clarifications

### Session 2026-09-25

- Q: ¿Cancelar la suscripción y cobrar una renovación de mostrador, o pagar la factura atrasada? → A: Pagar la factura atrasada, marcándola en Stripe como pagada fuera de Stripe (`paid_out_of_band`). La suscripción sigue viva y se cobra sola los meses siguientes; cancelarla obligaría al socio a volver a contratar en línea y perdería su renovación automática.
- Q: ¿Cuánto se cobra? → A: Lo que Stripe dice que se debe (el `amount_due` de la factura abierta), no un precio calculado aquí: es exactamente la factura que se está saldando.
- Q: ¿Qué ve mostrador? → A: Al buscar a un socio en gracia con suscripción, en vez de solo "se renueva en línea": "Pago atrasado: $X" y "COBRAR ATRASO" con el mismo selector de forma de pago (y crédito/débito, spec 009). Al cobrar, el ticket con autofactura (spec 003).
- Q: ¿Y si Stripe no acepta? → A: No se registra nada (ni caja ni cobro): primero Stripe, después la base. Mostrador ve el error y puede reintentar.
- Q: ¿Doble registro? → A: El cobro lo registra mostrador (canal `counter_membership`, sucursal que cobró). El webhook `invoice.paid` de una factura `paid_out_of_band` no registra otro. Un segundo "COBRAR" responde 409 porque la factura ya no está abierta.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cobrar el atraso en efectivo (Priority: P1) 🎯 MVP

**Independent Test**: e2e con Stripe sobreescrito — socio en gracia con factura abierta de $1,550 → `GET /branches/1/memberships/overdue` da 1550 → `POST` en efectivo → Stripe recibe `invoices.pay(id, { paid_out_of_band: true })`, la membresía queda activa hasta el nuevo fin de periodo, hay un pago de mostrador y un cobro `cash` en la sucursal 1. branch-app (mock): el socio en gracia muestra el atraso y se cobra.

**Acceptance Scenarios**:

1. **Given** un socio en gracia con factura abierta, **When** mostrador lo busca, **Then** ve el monto del atraso y "COBRAR ATRASO".
2. **Given** que cobra en efectivo, **When** confirma, **Then** la membresía queda activa, el corte de caja lo ve y se imprime el ticket.
3. **Given** que ya se cobró, **When** alguien vuelve a cobrar, **Then** 409 `NOTHING_TO_PAY` y nada se registra.
4. **Given** que Stripe falla, **When** cobra, **Then** 502 `PAYMENT_PROVIDER_ERROR` y nada se registra.

### Edge Cases

- Socio sin suscripción o sin factura abierta: 409 `NOTHING_TO_PAY`.
- El webhook `invoice.paid` de esa factura llega después: la membresía ya está activa (releer la suscripción es idempotente) y no hay segundo cobro.

## Requirements *(mandatory)*

- **FR-001**: `GET /branches/:id/memberships/overdue?qrCode=` MUST devolver el atraso (pesos) de la factura abierta, o 409.
- **FR-002**: `POST /branches/:id/memberships/overdue` MUST marcar la factura pagada fuera de Stripe ANTES de registrar el pago de caja y el cobro, y releer la suscripción.
- **FR-003**: El webhook MUST ignorar para el registro de cobros una factura `paid_out_of_band`.
- **FR-004**: branch-app MUST mostrar el atraso y cobrarlo (mock y HTTP), con ticket.

## Success Criteria *(mandatory)*

- **SC-001**: Un socio en gracia con efectivo sale de mostrador con acceso en un solo cobro, sin perder su suscripción.

## Assumptions

- Stripe acepta `paid_out_of_band` en facturas abiertas de suscripciones (documentado por Stripe). Sin probar contra el sandbox.
