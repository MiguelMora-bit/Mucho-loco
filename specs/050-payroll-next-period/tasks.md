---

description: "Task list for La nómina nunca se queda sin quincena"
---

# Tasks: La nómina nunca se queda sin quincena

- [X] T001 Unit (fallando) + `nextPeriodRange`/`periodContaining` en `apps/backend/src/payroll/payroll-periods.ts` (1–15 → 16–fin, 16–fin → 1–15 siguiente, febrero y bisiesto, diciembre, irregular, sin quincenas). Archivo propio y no `payroll.math.ts`: ese es el cálculo ilustrativo de ISR/IMSS.
- [X] T002 e2e (fallando) en `branch-ops.e2e-spec.ts`: correr abre la siguiente; `POST /payroll/periods/next` 409 con una abierta, 201 sin ninguna, 403 gerente.
- [X] T003 Backend: migración `20260926172406_payroll_period_dates` (`startDate`/`endDate` a `DATE` + único en `startDate` — con `timestamp` el índice no frenaba "el mismo día a otra hora"), `runPayroll` abre la siguiente en su transacción, `openNextPeriod` (P2002 → 409 con la que ganó), ruta, `PERIOD_ALREADY_OPEN`. Unit del service (+6).
- [X] T004 owner-panel: gemela en `lib/payroll.ts` (+ test), `openNextPeriod` (mock + HTTP + `PeriodAlreadyOpenError` + tests), el mock abre la siguiente al correr, banner "Abrir siguiente quincena" en `PayrollPage` cuando no hay abierta, y tras correr la pantalla se queda en la quincena pagada con el aviso de la nueva. Textos es/en.
- [X] T005 Docs y validación: backend unit (payroll 27) + e2e `branch-ops` 80/80 + tsc; owner-panel 102 unit + 19 integración contra el backend local + build; recorrido en navegador (Playwright, mock) de correr y de destrabar, sin errores de consola.
