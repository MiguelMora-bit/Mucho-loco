---

description: "Task list for Alertas de QR compartido"
---

# Tasks: Alertas de QR compartido

- [X] T001 Tipos `CheckIn.firstBranch`, `AccessAlert`.
- [X] T002 e2e (fallando) en `branch-ops.e2e-spec.ts`: otra sucursal → `firstBranch` + alerta; misma sucursal → sin alerta; `GET /access-alerts` owner 200 (más reciente primero), manager 403.
- [X] T003 Backend: modelo + migración, `recordEntry` con alerta, `GET /access-alerts`. Hace pasar T002.
- [X] T004 branch-app: `firstBranch` en el mock, aviso rojo en `QrValidationPage`, textos; tests.
- [X] T005 owner-panel: `getAccessAlerts` (mock + HTTP + tests), sección en `DashboardPage`, textos.
- [X] T006 Docs y validación.
