# Feature Specification: Altas y renovaciones de membresía en mostrador

**Feature Branch**: `035-counter-memberships` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de la pestaña Membresías de branch-app: dar de alta a un socio sin app y renovar membresías cobrando en mostrador.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Ser socio no exige cuenta en la app: el alta de mostrador crea un `User` sin `cognitoSub` ni correo (2026-09-12).
- Alta por QR o por huella (solo altas nuevas sin app; lector mockeado hasta tener el SDK real, 2026-09-12). El registro SIEMPRE tiene un `accessCode` interno.
- El código es impredecible (`ML-QR-` + 12 hex de un UUID), no secuencial (auditoría 2026-09-10).
- Precio del servidor: `single` = precio de la sucursal que cobra × periodo; `all` = precio fijo de la cadena (2026-09-15). El cliente nunca manda importe.
- Renovar una membresía vigente suma desde su vencimiento, no desde hoy (spec 006); a quien Stripe ya le cobra sola no se le renueva aquí (`MEMBER_RENEWS_ONLINE`); si está en gracia con suscripción, se cobra el atraso (spec 019).
- Formas de pago: efectivo, tarjeta (crédito/débito, spec 009) y transferencia; cada cobro con ticket (spec 003).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dar de alta a un socio sin app (Priority: P1)

Mostrador captura nombre, teléfono, plan y periodo, elige QR o huella, cobra y entrega el código.

**Independent Test**: `apps/backend/test/branch-ops.e2e-spec.ts` ("counter memberships"); `apps/branch-app/src/lib/repositories/membership.repository.test.ts`; alta por HTTP con token real (2026-09-26).

**Acceptance Scenarios**:

1. **Given** un socio nuevo, **When** se da de alta con QR, **Then** recibe un código `ML-QR-…` que valida de inmediato.
2. **Given** un socio sin app, **When** se da de alta con huella, **Then** la huella queda ligada y valida en `/qr`.
3. **Given** un body con `amount`, **When** se manda, **Then** 400: el precio lo pone el servidor.

### User Story 2 - Renovar (Priority: P1)

Mostrador busca al socio por QR y cobra la renovación.

**Independent Test**: `branch-ops.e2e-spec.ts` ("renewing moves the member to the new tier and branch", renovar suma desde el vencimiento); `counter-memberships.service.spec.ts`.

**Acceptance Scenarios**:

1. **Given** una membresía vigente con 10 días, **When** se renueva un mes, **Then** el nuevo vencimiento es el anterior + 30 días.
2. **Given** una membresía vencida, **When** se renueva, **Then** cuenta desde hoy.
3. **Given** un socio con suscripción viva, **When** se intenta renovar, **Then** aviso "se renueva en línea" y el cobro deshabilitado.

### Edge Cases

- Renovar puede cambiar de plan y de sucursal de inscripción: el alcance de acceso refleja el plan nuevo.
- Mismo precio de `all` en cualquier sucursal (Roma Sur y Santa Fe cobran $1,550).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El alta MUST crear socio, membresía, pago de caja y cobro en una transacción, sin cuenta de app.
- **FR-002**: El código de acceso MUST ser impredecible y único; la huella es opcional.
- **FR-003**: El precio MUST calcularlo el servidor por sucursal, plan y periodo.
- **FR-004**: Renovar MUST sumar desde el vencimiento si sigue vigente, y rechazar a quien renueva en línea.
- **FR-005**: Cada cobro MUST registrar forma de pago (y crédito/débito con tarjeta).

### Key Entities

- Membership, MembershipPayment (datos congelados al cobrar), User sin cuenta.

## Success Criteria *(mandatory)*

- **SC-001**: Un socio sin teléfono inteligente queda dado de alta y entrando en un solo paso de mostrador.

## Assumptions

- El lector de huella real (SDK/driver) reemplazará `fingerprintScanner.ts`.

## Fuera de alcance / pendiente conocido

- Integrar el lector de huella real.
- Agregar huella a un socio que ya tiene la app (fuera de alcance por decisión).
