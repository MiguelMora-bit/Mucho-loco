# Implementation Plan: Preferencias de avisos de WhatsApp

**Branch**: `053-notification-preferences` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

## Summary

- **Tipos**: `NotificationPreferences`; `Translations.dashboard.settings.notifSaveError`; textos de los interruptores ajustados a la categoría.
- **Backend**: columnas `notifyMembership`/`notifyOrders`/`notifyPayments` en `users` (default `true`); `notifications/preferences.ts` (puro: `NOTIFICATION_CATEGORY`, `preferencesOf`, `allows`) con test; `notifyOnce` recibe las preferencias del socio y omite sin registrar; `UsersService.get/updateNotificationPreferences` + `NotificationPreferencesDto` + rutas en `users.controller.ts`.
- **customer-core**: contrato, mock (en el `UserRecord` de `globalThis`) y HTTP.
- **customer-app**: `PUT /api/profile/notifications` (valida sesión y forma), la página del panel carga las preferencias, `SettingsPane` guarda al tocar con reversión.
- **mobile-app**: sección de avisos en Cuenta (`NotificationSettings`, `Switch` nativo) sobre el mismo repositorio.

## Constitution Check

I ✅ contrato + mock + HTTP · II ✅ el backend decide si manda · III ✅ solo el socio del token · V ✅ unit puro, unit del service, e2e, route handler, walkthroughs · VII ✅ CLAUDE.md de backend/customer-app/mobile-app y spec 027.
