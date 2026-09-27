---

description: "Task list for Preferencias de avisos de WhatsApp"
---

# Tasks: Preferencias de avisos de WhatsApp

- [X] T001 Tipos (`NotificationPreferences`, `notifSaveError`) y textos de los interruptores ajustados a la categoría (es/en, sin reformatear los JSON).
- [X] T002 `notifications/preferences.ts` (`NOTIFICATION_CATEGORY` como `Record` sobre el enum, `preferencesOf`, `allows`) + test; unit del service: aviso omitido sin registrar, y "pedido listo" sale aunque pagos esté apagado (25).
- [X] T003 e2e en `app.e2e-spec.ts` ("notification preferences"): default prendido, guardar y releer, 400 (parcial, no booleano, campo de más), 401, y de punta a punta contra la base: con pagos apagados solo sale `pedido_listo` (WhatsApp con spy). 45/45; `payments.e2e` 11/11.
- [X] T004 Backend: migración `20260927015104_notification_preferences`, `NotificationPreferencesDto`, `UsersService.get/updateNotificationPreferences`, rutas, `notifyOnce` con preferencias. 352 unit.
- [X] T005 customer-core: contrato, mock (`UserRecord.notifications`, en `globalThis`) y HTTP (+ tests). 161.
- [X] T006 customer-app: `PUT /api/profile/notifications` (+ test), la página carga las preferencias, `SettingsPane` guarda al tocar con reversión y aviso. 197 unit, tsc, lint, build. **Sin verificar en navegador**: el panel web necesita sesión de Cognito.
- [X] T007 mobile-app: `NotificationSettings` en Cuenta (`Switch`, pulgar crema en web vía `activeThumbColor`); walkthrough de Playwright (apagar y prender "Confirmación de pago") 3/3 y captura revisada.
- [X] T008 Docs: CLAUDE.md de backend/customer-app/mobile-app, spec 027, índice.
