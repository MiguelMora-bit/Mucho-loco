---

description: "Task list for Aviso de WhatsApp tu pedido va en camino"
---

# Tasks: Aviso de WhatsApp "tu pedido va en camino"

- [X] T001 `order_shipped` en `enum NotificationKind` de `apps/backend/prisma/schema.prisma` + migración (dev y test).
- [X] T002 [US1] Unit (fallando) en `notifications.service.spec.ts`: `notifyOrderShipped` manda `pedido_en_camino` con `[nombre, pedido corto, guía]`, "sin guía por ahora" sin guía, `dedupeKey` = id del pedido.
- [X] T003 [US1] `notifyOrderShipped` en `notifications.service.ts` + plantilla. Hace pasar T002.
- [X] T004 [US1] Unit (fallando) en `shipments.service.spec.ts`: `markShipped` llama `notifyOrderShipped` después de guardar; si el aviso falla el envío igual se devuelve en camino.
- [X] T005 [US1] `ShipmentsModule` importa `NotificationsModule`; `markShipped` avisa. Hace pasar T004.
- [X] T006 Docs (`apps/backend/CLAUDE.md`: plantilla nueva, pendiente resuelto) y validación (unit + e2e completo).
