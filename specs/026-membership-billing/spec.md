# Feature Specification: Contratar y pagar la membresía

**Feature Branch**: `026-membership-billing` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de la membresía del socio: planes, precios, contratación en línea con Stripe Billing, gracia y vencimiento (2026-09-13).

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Dos alcances ortogonales a la duración: `single` ("1 sucursal", precio de la sucursal elegida) y `all` ("15 sucursales", precio fijo en toda la cadena: `basePrice` $1,550/mes, provisional, 2026-09-15).
- Periodos: visita, semanal, mensual, trimestral y anual, con multiplicadores sobre el mensual (0.12, 0.35, 1, 2.7, 9.5). El precio que cobra lo calcula el backend (`membership-plans.ts`); el de la pantalla es vista previa.
- Un socio nuevo **nace sin membresía** hasta su primer cobro (antes se regalaba una).
- Visita = pago único; los demás = suscripción de Stripe que se cobra sola. El estado lo decide Stripe: cada evento relee la suscripción (`syncSubscription`).
- Cobro fallido → gracia de 7 días (`GRACE_DAYS`); después vence. El estado efectivo se calcula al leer (`effectiveStatus`) y un cron cada hora lo persiste.
- No cobrar dos veces: 409 `ALREADY_SUBSCRIBED` con suscripción viva; visita encima de una vigente → 409 `MEMBERSHIP_STILL_ACTIVE`; renovar antes no pierde días (`trial_end`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Contratar un plan (Priority: P1)

El socio elige sucursal, alcance y periodo, ve el precio y paga en Stripe.

**Independent Test**: `apps/backend/test/membership-billing.e2e-spec.ts` (ciclo completo con Stripe sobreescrito); sandbox de Stripe 2026-09-13; walkthrough del móvil ("elige plan y paga").

**Acceptance Scenarios**:

1. **Given** un socio sin membresía, **When** contrata mensual de 1 sucursal, **Then** paga en Stripe y su membresía queda activa hasta el fin del periodo de Stripe.
2. **Given** una visita, **When** paga, **Then** queda activa 24 horas, sin renovación.
3. **Given** una suscripción viva, **When** intenta contratar otra, **Then** 409 `ALREADY_SUBSCRIBED`.

### User Story 2 - Cobro fallido y gracia (Priority: P1)

Si Stripe no puede cobrar la renovación, el socio entra a gracia y puede pagar la factura con otra tarjeta.

**Independent Test**: `membership-billing.e2e-spec.ts` (falla la renovación → gracia → paga la factura → activa).

**Acceptance Scenarios**:

1. **Given** la renovación rechazada, **When** Stripe avisa, **Then** la membresía pasa a gracia por 7 días y sigue abriendo la puerta.
2. **Given** en gracia, **When** paga la factura pendiente, **Then** vuelve a activa.
3. **Given** la gracia vencida, **When** intenta entrar, **Then** el acceso se niega (estado efectivo `expired`).

### User Story 3 - Ver precios en el landing (Priority: P2)

El landing muestra los planes con el precio de la sucursal elegida y lleva a contratar con el plan preseleccionado.

**Independent Test**: `packages/customer-core/src/pricing.test.ts`; `apps/customer-app/tests/integration/landing.contract.test.ts` (tiers).

**Acceptance Scenarios**:

1. **Given** la sucursal Coyoacán, **When** ve el plan de 1 sucursal, **Then** ve el precio de esa sucursal.
2. **Given** cualquier sucursal, **When** ve el plan de 15 sucursales, **Then** ve el mismo precio fijo.

### Edge Cases

- Eventos de Stripe fuera de orden o reentregados: no cambian el resultado (se relee la suscripción).
- Webhook de renovación atrasado: se toleran 3 días (`RENEWAL_TOLERANCE_DAYS`) antes de dar por vencida una membresía con suscripción.
- Contratar desde gracia o suspendido: la suscripción vieja se cancela antes de ligar la nueva.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El precio cobrado MUST calcularse en el servidor desde sucursal, alcance y periodo; el cliente nunca manda importe.
- **FR-002**: Visita MUST cobrarse como pago único; los demás periodos como suscripción de Stripe con la dueña en `subscription_data.metadata`.
- **FR-003**: La membresía MUST existir solo tras un cobro confirmado por webhook.
- **FR-004**: Un cobro fallido MUST dar 7 días de gracia; al vencer, el acceso se niega aunque ningún proceso haya actualizado la fila.
- **FR-005**: El sistema MUST impedir dos suscripciones vivas y una visita encima de una membresía vigente.
- **FR-006**: El socio en gracia MUST poder abrir la factura pendiente de Stripe (`POST /payments/membership-invoice`).

### Key Entities

- MembershipTier (`key`, `factor`, `basePrice?`), Membership (`tierKey`, `periodKey`, `expiresAt`, `status`, `graceEndsAt`, `stripeSubscriptionId`, `renewalCanceled`), MembershipPurchase (visitas).

## Success Criteria *(mandatory)*

- **SC-001**: Una membresía vencida deja de abrir la puerta en el momento en que vence.
- **SC-002**: Ningún evento reentregado suma días de más.

## Assumptions

- El webhook de Stripe tiene los eventos de checkout, factura y suscripción configurados.

## Fuera de alcance / pendiente conocido

- Renovación natural al fin de periodo contra Stripe real (requiere test clocks y un sandbox reclamado).
- Monto final de `all` lo confirma el dueño.
