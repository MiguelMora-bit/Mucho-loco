# Feature Specification: Renovación en mostrador sin doble cobro ni días perdidos

**Feature Branch**: `006-counter-renewal-subscription-guard`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "branch-app renovando en mostrador a un socio con suscripción viva le cobraría dos veces — el mostrador no sabe de la suscripción (pendiente en apps/backend/CLAUDE.md)."

## Clarifications

### Session 2026-09-25

- Q: ¿Qué hace mostrador con un socio cuya membresía se cobra sola en línea? → A: No lo deja renovar: avisa antes de cobrar y el backend lo rechaza. Si el socio quiere pagar en mostrador, primero cancela la renovación desde "Administrar suscripción" en la app (spec 005); con la renovación cancelada sí se puede.
- Q: ¿Desde cuándo cuenta una renovación en mostrador? → A: Desde el vencimiento actual si la membresía sigue vigente (no se pierden los días pagados, igual que en línea); desde hoy si ya venció.
- Q: ¿Y un socio en periodo de gracia (su tarjeta falló)? → A: Tiene suscripción viva que se sigue intentando cobrar: mostrador lo bloquea con el mismo aviso (pagar el adeudo en la app o cancelar la renovación). Tomar el cobro en mostrador cancelando la suscripción queda fuera de alcance.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - No cobrar dos veces (Priority: P1) 🎯 MVP

Al buscar a un socio para renovar, si su membresía se cobra sola en línea, mostrador ve un aviso claro y el botón de cobrar deshabilitado; si aun así se intenta (otra pestaña, lista vieja), el sistema lo rechaza sin cobrar.

**Why this priority**: es dinero cobrado dos veces a un cliente — el peor error posible en caja.

**Independent Test**: buscar el QR de un socio con suscripción → aviso + botón deshabilitado; forzar la renovación → rechazo `MEMBER_RENEWS_ONLINE` sin pago registrado.

**Acceptance Scenarios**:

1. **Given** un socio con suscripción viva que se renueva, **When** mostrador lo busca para renovar, **Then** ve "Este socio paga su membresía en la app y se cobra sola; no se puede renovar aquí" y no puede confirmar.
2. **Given** ese socio, **When** se intenta renovar de todas formas, **Then** el sistema lo rechaza y no se registra ningún cobro.
3. **Given** un socio que canceló la renovación en la app, **When** mostrador lo renueva, **Then** se cobra normalmente.

---

### User Story 2 - No perder días pagados (Priority: P1)

Renovar en mostrador a un socio con membresía vigente suma el periodo al final de lo que ya tenía pagado.

**Why this priority**: hoy cada renovación anticipada en mostrador le quita días pagados al socio.

**Independent Test**: renovar un mes a un socio con 10 días restantes → vence en 40 días.

**Acceptance Scenarios**:

1. **Given** una membresía vigente que vence en 10 días, **When** se renueva un mes en mostrador, **Then** vence en 10 + 30 días.
2. **Given** una membresía vencida, **When** se renueva, **Then** el periodo cuenta desde hoy.

---

### Edge Cases

- Socio en gracia (suscripción viva con pago fallido): bloqueado con el mismo aviso.
- Socio de mostrador (sin app ni suscripción): sin cambios.
- Mock y backend rechazan igual; el error llega como error tipado, no como texto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El registro que mostrador obtiene al buscar un socio MUST indicar si su membresía se cobra sola en línea.
- **FR-002**: Mostrador MUST mostrar el aviso y deshabilitar el cobro para esos socios.
- **FR-003**: El sistema MUST rechazar la renovación en mostrador de un socio con suscripción viva que se renueva (`MEMBER_RENEWS_ONLINE`), sin registrar cobro.
- **FR-004**: Con la renovación cancelada, la renovación en mostrador MUST permitirse.
- **FR-005**: Una renovación en mostrador de una membresía vigente MUST sumarse desde su vencimiento actual; de una vencida, desde hoy.
- **FR-006**: Mock y backend MUST comportarse igual; textos es/en.

### Key Entities

- **Registro de acceso del socio** (lo que ve mostrador): gana "se cobra sola en línea".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 cobros dobles de membresía entre mostrador y suscripción.
- **SC-002**: 0 días pagados perdidos al renovar en mostrador antes del vencimiento.

## Assumptions

- `renewalCanceled` existe desde el spec 005.
- branch-app requiere User Pool vivo para validar en navegador.
