# Implementation Plan: Aviso de WhatsApp "tu pedido va en camino"

**Branch**: `008-shipment-whatsapp-notice` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
`NotificationKind.order_shipped` (migración `ALTER TYPE … ADD VALUE`), plantilla `pedido_en_camino`, `NotificationsService.notifyOrderShipped(orderId)` con `dedupeKey = orderId`, llamado por `ShipmentsService.markShipped` después de guardar.

## Technical Context
NestJS + Prisma 6 · WhatsApp Cloud API (sin probar contra Meta) · Jest unit + e2e contra Postgres.

## Constitution Check
II ✅ el aviso sale del estado ya guardado · V ✅ unit + e2e · VI ✅ reusa `notifyOnce` (idempotencia en base) · VII ✅ CLAUDE.md (plantilla nueva a dar de alta en Meta).

## Project Structure
```text
apps/backend/prisma/{schema.prisma,migrations/*_notification_order_shipped}
apps/backend/src/notifications/notifications.service.ts (+ spec)
apps/backend/src/shipments/{shipments.module.ts,shipments.service.ts} (+ spec)
```

## Complexity Tracking
Sin violaciones.
