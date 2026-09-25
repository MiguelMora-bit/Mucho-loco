# Feature Specification: Administrar la suscripción de membresía (portal de Stripe)

**Feature Branch**: `005-stripe-billing-portal`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "Hoy el socio no puede cancelar su membresía recurrente ni cambiar su tarjeta desde la app (pendiente en apps/backend/CLAUDE.md). Darle acceso al portal de cliente de Stripe desde la web y el móvil, y que la app refleje correctamente cuando la renovación está cancelada."

## Clarifications

### Session 2026-09-24

- Q: ¿Portal hospedado de Stripe o pantallas propias? → A: Portal hospedado de Stripe (Customer Portal): cancelar, reactivar, cambiar tarjeta y ver facturas de Stripe, sin construir pantallas ni manejar tarjetas.
- Q: ¿Cancelar corta el acceso ya? → A: No: cancela al fin del periodo pagado (configuración del portal); el socio conserva el acceso hasta `expiresAt` y la app dice "no se renovará".
- Q: ¿Cambiar de plan desde el portal? → A: Fuera de alcance: los precios son dinámicos por sucursal/tier (`price_data`) y el portal solo cambia entre precios fijos del catálogo de Stripe. Cambiar de plan = contratar de nuevo al vencer.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cancelar la renovación o cambiar la tarjeta (Priority: P1) 🎯 MVP

Un socio con membresía que se renueva sola toca "Administrar suscripción" en su panel (web o móvil), llega al portal de Stripe, cancela la renovación o cambia su tarjeta, y vuelve a la app.

**Independent Test**: con un socio suscrito, el botón abre el portal (mock: regresa directo); al volver, si canceló, el panel dice "no se renovará; vence el X".

**Acceptance Scenarios**:

1. **Given** una membresía con suscripción viva, **When** el socio toca "Administrar suscripción", **Then** llega al portal de Stripe de su cuenta y al terminar vuelve a su panel.
2. **Given** que canceló la renovación en el portal, **When** vuelve, **Then** el panel dice que no se renovará y hasta cuándo tiene acceso, y ya no dice "se renueva sola".
3. **Given** un socio sin suscripción (visita, mostrador, sin membresía), **When** ve su panel, **Then** no aparece "Administrar suscripción".

---

### User Story 2 - Reactivar la renovación (Priority: P2)

Un socio que canceló la renovación y cambió de opinión vuelve al portal y la reactiva antes de que venza.

**Acceptance Scenarios**:

1. **Given** una renovación cancelada y vigente, **When** el socio toca "Administrar suscripción" y la reactiva, **Then** al volver el panel dice otra vez "se renueva sola el X".

---

### User Story 3 - Avisos correctos de vencimiento (Priority: P2)

Un socio que canceló la renovación recibe los avisos de "por vencer" por WhatsApp como cualquiera sin suscripción (antes se omitían a todo suscrito).

**Acceptance Scenarios**:

1. **Given** una renovación cancelada que vence en 3 días, **When** corre el barrido diario, **Then** se le manda el aviso de "por vencer".

---

### Edge Cases

- Portal no disponible (Stripe caído / sin llave): mensaje claro, nada cambia.
- Socio con cliente de Stripe pero sin suscripción viva (ya venció): no se ofrece el botón.
- El socio cancela en el portal y el webhook llega tarde: la app refleja el cambio en cuanto llega (el estado siempre lo decide Stripe).
- Idioma: el portal de Stripe se abre en el idioma de la app (`locale`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El panel del socio (web y móvil) MUST ofrecer "Administrar suscripción" solo cuando su membresía tiene una suscripción de Stripe viva.
- **FR-002**: El botón MUST abrir el portal de cliente de Stripe de SU cuenta (identidad por sesión) y regresar al panel al terminar.
- **FR-003**: Cuando la renovación está cancelada (al fin del periodo), la app MUST decir que no se renovará y hasta cuándo hay acceso, y MUST NOT decir "se renueva sola".
- **FR-004**: Reactivar la renovación en el portal MUST devolver el panel a "se renueva sola".
- **FR-005**: Los avisos de "por vencer" MUST mandarse también a quien tiene la renovación cancelada.
- **FR-006**: Si el portal no se puede abrir, la app MUST mostrar un mensaje claro y no cambiar nada.
- **FR-007**: Todo MUST funcionar con datos de prueba (mock) igual que contra el backend.

### Key Entities

- **Membresía**: gana "tiene suscripción" y "renovación cancelada", derivados de Stripe.

## Success Criteria *(mandatory)*

- **SC-001**: Un socio cancela su renovación en menos de 1 minuto sin contactar a la sucursal.
- **SC-002**: 0 casos de "se renueva sola" en una membresía con la renovación cancelada.

## Assumptions

- El portal se configura una vez en el dashboard de Stripe (cancelación al fin del periodo, actualizar método de pago, historial); sin cambio de plan.
- Sin User Pool vivo, la web no se puede recorrer en navegador; el móvil sí (Expo web con auth mock).
