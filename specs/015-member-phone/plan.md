# Implementation Plan: Teléfono del socio — completarlo y cambiarlo

**Branch**: `015-member-phone` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
Backend: `UpdatePhoneDto` (`@Matches(/^\+\d{8,15}$/)`, igual que la dirección de envío), `UsersService.updatePhone`, `PUT /users/me/phone`. customer-core: `IUserRepository.updatePhone(email, phone)` en mock y HTTP; textos `dashboard.phone.*`. customer-app: route handler `PUT /api/profile/phone` (valida con `toE164`, 400 `INVALID_PHONE`), `PhoneForm`, aviso en `HomePane`, "Cambiar" en `ProfilePane`, estado del perfil en `DashboardClient`. mobile-app: aviso y "Cambiar" en `Dashboard` con `Field`.

## Constitution Check
I ✅ contrato + mock + HTTP · II ✅ la identidad sale del token, nunca del body · III ✅ `toE164` y textos compartidos · IV ✅ traducido · V ✅ e2e backend, route test, walkthrough móvil · VI ✅ un campo, sin tocar Cognito · VII ✅ CLAUDE.md.

## Project Structure
```text
apps/backend/src/users/{dto/update-phone.dto.ts, users.service.ts, users.controller.ts}, test/app.e2e-spec.ts
packages/types/src/index.ts (Translations.dashboard.phone)
packages/customer-core/{src/contract.ts, src/mock/user.mock.ts, src/http/account.http.ts, messages/*.json}
apps/customer-app/{app/api/profile/phone/route.ts (+test), components/dashboard/{PhoneForm,HomePane,ProfilePane}.tsx, components/DashboardClient.tsx}
apps/mobile-app/src/components/account/Dashboard.tsx, tests/e2e/walkthrough.spec.ts
```
