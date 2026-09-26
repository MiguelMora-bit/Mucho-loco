# Feature Specification: Avisos por WhatsApp

**Feature Branch**: `047-whatsapp-notices` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo del módulo `notifications` del backend (2026-09-12): avisos al socio por WhatsApp Business Platform.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- WhatsApp sobre correo: es el canal dominante en México.
- Plantillas aprobadas (fuera de la ventana de 24 h Meta solo permite plantillas): `pago_confirmado`, `pedido_listo`, `pedido_en_camino`, `membresia_por_vencer`, `membresia_pago_fallido`.
- Idempotencia en la base (`@@unique([userId, kind, dedupeKey])`): el barrido diario no repite avisos; los avisos de vencimiento a 7/3/1 días comparten llave (la fecha de vencimiento), así llega UNO por ciclo.
- Un aviso que falla no tumba lo que lo disparó: se registra `failed` y se sigue; se envía fuera de la transacción del cobro.
- Cron a las 9 a.m. de CDMX para vencimientos y gracia; ya no avisa "por vencer" a quien tiene suscripción que se cobra sola (sí a quien canceló la renovación).
- Teléfonos normalizados a E.164; el webhook de Meta responde 200 aunque la firma sea inválida (Meta desactiva webhooks que fallan).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enterarme de lo importante (Priority: P1)

El socio recibe un WhatsApp cuando su pago se confirma, su pedido está listo o en camino, o su membresía está por vencer o en gracia.

**Independent Test**: `apps/backend/src/notifications/notifications.service.spec.ts`; `apps/backend/test/notifications.e2e-spec.ts`.

**Acceptance Scenarios**:

1. **Given** un pedido pagado, **When** llega el webhook de Stripe, **Then** se manda `pago_confirmado` una vez.
2. **Given** una membresía que vence en 7, 3 y 1 días, **When** corre el barrido diario, **Then** llega un solo aviso por ciclo.
3. **Given** un socio sin teléfono, **When** se dispara un aviso, **Then** se omite y se registra.

### Edge Cases

- Meta caído: el cobro sigue; el aviso queda `failed` y el barrido no reintenta en bucle.
- Dos instancias del backend: el índice único evita el aviso duplicado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada aviso MUST usar su plantilla aprobada con parámetros posicionales.
- **FR-002**: Un aviso MUST mandarse a lo más una vez por (socio, tipo, llave).
- **FR-003**: Un fallo de envío MUST registrarse sin afectar la operación que lo disparó.
- **FR-004**: Los avisos de vencimiento y gracia MUST salir de un cron diario a las 9 a.m. de CDMX.

### Key Entities

- Notification (`kind`, `dedupeKey`, `status`, `template`, `providerMessageId`).

## Success Criteria *(mandatory)*

- **SC-001**: Ningún socio recibe el mismo aviso dos veces.

## Assumptions

- Sin probar contra Meta: falta la app verificada y las plantillas aprobadas.

## Fuera de alcance / pendiente conocido

- App de Meta Business, número y las cinco plantillas aprobadas.
- Sacar el cron del proceso (EventBridge o tarea de ECS) al escalar a varias instancias.
- Respetar las preferencias de avisos del socio (hoy la pantalla de Configuración no las guarda).
