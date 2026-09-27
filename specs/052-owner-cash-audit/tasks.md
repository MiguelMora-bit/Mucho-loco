---

description: "Task list for Auditoría de cortes de caja desde HQ"
---

# Tasks: Auditoría de cortes de caja desde HQ

- [X] T001 Tipos: `CashRegisterShift.closedBy/countedCash/expectedCash`, `CashShiftAudit`.
- [X] T002 Unit (fallando) + `shiftTotals`/`cashDifference` en `apps/backend/src/cash-register/shift-totals.ts`.
- [X] T003 e2e (fallando) en `branch-ops.e2e-spec.ts` ("cash register"): cerrar sin contado → 400; con contado → congela esperado, contado y quién cerró; `GET /cash-register/audit` para dueño con la diferencia, 403 gerente, 400 mes inválido, filtro por sucursal.
- [X] T004 Backend: migración `20260926220255_cash_shift_count`, `CloseShiftDto`, `closeShift` con congelado y cierre condicional (`updateMany where status = open`), `getAudit`, ruta. Unit del service (22).
- [X] T005 branch-app: contrato/mock/HTTP con `countedCash`, `cashDifference` (+ test), cierre con arqueo y vista previa, historial con contado, diferencia y quién cerró, textos es/en (se quitó `closeConfirm`, sin uso).
- [X] T006 owner-panel: `cashAudit` repository (mock + HTTP + tests), `lib/cashAudit.ts` (+ test), `/cash-audit` en el nav ("Cortes"), textos es/en, integración de rutas.
- [X] T007 Validación: backend unit + e2e `branch-ops` 83/83 (una corrida previa tuvo timeouts de 5 s en tests ajenos justo tras `prisma generate`; la siguiente, limpia) + tsc; branch-app 162 unit + 23 integración + build; owner-panel 111 unit + 21 integración + build; recorrido en navegador (Playwright, mock) de cerrar con arqueo y de auditar, sin errores de consola. Docs: CLAUDE.md de los 3 apps, spec 034, índice.
