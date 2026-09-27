---

description: "Task list for Corregir gastos"
---

# Tasks: Corregir gastos

- [X] T001 e2e (fallando, 4) en `branch-ops.e2e-spec.ts` ("expenses"): fecha capturada / default hoy CDMX / futura, inexistente o mal formada → 400; centavos, cero y concepto vacío → 400; editar (incluida sucursal → corporativo y conservar la fecha sin mandarla) y borrar; 404 `EXPENSE_NOT_FOUND`; orden por fecha desc; gerente 403.
- [X] T002 Backend: migración `20260927020611_expense_date_day` (`DATE`; las filas del seed conservan su día, las creadas con `new Date()` pasan a su día de CDMX), `ExpenseDto` (concepto recortado y no vacío ≤ 200, monto entero ≥ 1, fecha opcional), `expenseDay()`, `update`/`remove`, rutas `PUT`/`DELETE`, códigos `EXPENSE_NOT_FOUND`/`INVALID_EXPENSE_DATE`. Unit 11; e2e 87/87.
- [X] T003 owner-panel: contrato `update`/`remove` + `ExpenseNotFoundError` (mock + HTTP, fecha solo si se eligió), mock ordenado por fecha, `currentDay()` (+ test).
- [X] T004 `ExpensesPage`: fecha (default hoy, `max` hoy), monto entero, edición en el mismo formulario, borrado con confirmación, aviso si el gasto ya no existe; la tabla abre con la fecha y ya no usa `reverse()`. Textos es/en.
- [X] T005 Validación: owner-panel tsc, 118 unit, lint, 23 integración contra el backend local; recorrido en navegador (harness temporal, mock): alta con fecha, editar, borrar con confirmación, total actualizado, sin errores de consola.
- [X] T006 Docs: CLAUDE.md de backend y owner-panel, spec 041, índice.
