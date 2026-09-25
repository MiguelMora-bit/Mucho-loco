---

description: "Task list for Teléfono del socio"
---

# Tasks: Teléfono del socio — completarlo y cambiarlo

- [X] T001 [US1] e2e (fallando) en `apps/backend/test/app.e2e-spec.ts`: `PUT /users/me/phone` 200 y `GET /users/me` lo refleja; "5512" → 400; `name` en el body → 400.
- [X] T002 [US1] `UpdatePhoneDto`, `UsersService.updatePhone`, `PUT /users/me/phone`. Hace pasar T001.
- [X] T003 [US1] customer-core: `updatePhone` en contrato, mock y HTTP (tests); textos `dashboard.phone` es/en y tipo.
- [X] T004 [US1] customer-app: `PUT /api/profile/phone` (+ test de ruta), `PhoneForm`, aviso en `HomePane`, estado en `DashboardClient`.
- [X] T005 [US2] customer-app: "Cambiar" en `ProfilePane`.
- [X] T006 [US1][US2] mobile-app: aviso + cambiar en `Dashboard`; walkthrough.
- [X] T007 Docs y validación (tsc, tests, e2e backend, integración de ruta 401, build web, walkthrough).
