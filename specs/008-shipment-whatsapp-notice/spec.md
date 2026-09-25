# Feature Specification: Aviso de WhatsApp "tu pedido va en camino"

**Feature Branch**: `008-shipment-whatsapp-notice`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Pendiente de Envíos a domicilio en apps/backend/CLAUDE.md: aviso de WhatsApp 'tu pedido va en camino' cuando bodega marca el envío, con la guía si la hay."

## Clarifications

### Session 2026-09-25

- Q: ¿Cuándo se avisa? → A: Una sola vez, cuando bodega marca el pedido "en camino" (no al entregarse; la entrega la confirma el socio al recibirlo).
- Q: ¿Qué dice? → A: Nombre, número de pedido y guía de rastreo; si bodega no capturó guía, "sin guía por ahora" (las plantillas de Meta tienen número fijo de parámetros).
- Q: ¿Qué pasa si WhatsApp falla? → A: Igual que los otros avisos: se registra el fallo y el envío sigue marcado en camino.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enterarse de que el pedido salió (Priority: P1) 🎯 MVP

Cuando bodega marca un pedido a domicilio como enviado, el socio recibe un WhatsApp con su número de pedido y la guía para rastrearlo.

**Independent Test**: marcar enviado un pedido con guía → se manda la plantilla `pedido_en_camino` con nombre, pedido y guía, una sola vez.

**Acceptance Scenarios**:

1. **Given** un pedido cobrado a domicilio, **When** bodega lo marca en camino con guía, **Then** el socio recibe el aviso con la guía.
2. **Given** un pedido marcado sin guía, **When** se avisa, **Then** el aviso dice "sin guía por ahora".
3. **Given** un aviso ya enviado para ese pedido, **When** algo vuelve a dispararlo, **Then** no se manda otra vez.
4. **Given** que WhatsApp falla o el socio no tiene teléfono, **When** bodega marca el envío, **Then** el envío queda en camino igual.

## Requirements *(mandatory)*

- **FR-001**: Marcar un pedido "en camino" MUST disparar el aviso `pedido_en_camino` al socio.
- **FR-002**: El aviso MUST incluir nombre, número corto de pedido y la guía o "sin guía por ahora".
- **FR-003**: El aviso MUST mandarse una sola vez por pedido.
- **FR-004**: Un fallo del aviso MUST NOT afectar el cambio de estado del envío.

## Success Criteria *(mandatory)*

- **SC-001**: El 100% de los envíos marcados en camino generan un aviso registrado (enviado o fallido).

## Assumptions

- La plantilla `pedido_en_camino` se da de alta y se aprueba en Meta Business antes de producción (como las otras cuatro). Sin probar contra Meta.
