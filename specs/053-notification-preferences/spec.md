# Feature Specification: Preferencias de avisos de WhatsApp

**Feature Branch**: `053-notification-preferences`

**Created**: 2026-09-26

**Status**: Implemented (2026-09-26)

**Input**: Hueco del spec retroactivo 027: los interruptores de avisos de Configuración (web) son solo visuales — no se guardan, y el backend manda todos los avisos de WhatsApp igual.

## Clarifications

### Session 2026-09-26

- Q: ¿Qué se puede apagar? → A: Tres categorías, las mismas tres de la pantalla: **membresía** (por vencer y periodo de gracia), **pedidos** (listo para recoger y en camino) y **pagos** (confirmación de pago). Por categoría y no por aviso: cinco interruptores para cinco plantillas es más de lo que un socio quiere decidir.
- Q: ¿Default? → A: Todo prendido (los socios de hoy ya reciben todo; apagar es decisión suya). Columnas `Boolean @default(true)` en `User`.
- Q: ¿El aviso de gracia se puede apagar? → A: Sí. Es urgente, pero el panel y la app también lo muestran; forzarlo por WhatsApp contra la voluntad del socio no es nuestro para decidir.
- Q: ¿Un aviso omitido por preferencia se registra? → A: No. Si el socio lo vuelve a prender dentro del mismo ciclo, el barrido siguiente lo manda (la llave de idempotencia sigue libre).
- Q: ¿Dónde se configura? → A: Web (Configuración del panel) y móvil (Cuenta, junto al idioma), los dos sobre el mismo contrato de customer-core. Guardar al tocar cada interruptor; si falla, vuelve a su estado y avisa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Apagar un tipo de aviso (Priority: P1) 🎯 MVP

**Independent Test**: e2e — `PUT /users/me/notification-preferences` guarda y `GET` devuelve lo guardado; un socio con pagos apagados no recibe el WhatsApp de pago confirmado pero sí el de pedido listo. Web (mock): el interruptor persiste al recargar.

**Acceptance Scenarios**:

1. **Given** un socio nuevo, **When** abre Configuración, **Then** los tres avisos están prendidos.
2. **Given** que apaga "Confirmación de pago", **When** paga un pedido para recoger, **Then** recibe "pedido listo" pero no "pago confirmado".
3. **Given** que apagó membresía, **When** corre el barrido diario y le quedan 3 días, **Then** no se le avisa; si lo vuelve a prender antes del siguiente barrido, sí.
4. **Given** que falla el guardado, **When** toca un interruptor, **Then** vuelve a su estado anterior y ve el error.

### Edge Cases

- Body incompleto o con un campo que no es booleano → 400 (`forbidNonWhitelisted`).
- Socio sin teléfono: puede guardar preferencias igual (no dependen del teléfono).

## Requirements *(mandatory)*

- **FR-001**: `GET`/`PUT /users/me/notification-preferences` MUST leer y reemplazar las tres preferencias del socio del token.
- **FR-002**: `NotificationsService.notifyOnce` MUST omitir, sin registrar, un aviso cuya categoría está apagada; el mapeo aviso → categoría es una función pura probada.
- **FR-003**: `IUserRepository` (customer-core) MUST exponer `getNotificationPreferences`/`updateNotificationPreferences` con mock y HTTP.
- **FR-004**: Web y móvil MUST guardar al tocar y revertir si falla.

### Key Entities

- NotificationPreferences `{ membership, orders, payments }`.

## Success Criteria *(mandatory)*

- **SC-001**: Lo que el socio apaga en Configuración deja de llegarle por WhatsApp.

## Assumptions

- Los avisos a staff/HQ no existen todavía; esto es solo del socio.
