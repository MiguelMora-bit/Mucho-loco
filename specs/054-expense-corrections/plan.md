# Implementation Plan: Corregir gastos

**Branch**: `054-expense-corrections` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

## Summary

- **Backend**: migración `expenses.date` → `DATE`; `ExpenseDto` (alta y edición: `branchId` nullable, categoría, concepto no vacío ≤ 200, monto entero ≥ 1, `date` opcional `YYYY-MM-DD`); `ExpensesService.create/update/remove` con `expenseDay()` (fecha real y no futura en CDMX → 400 `INVALID_EXPENSE_DATE`), 404 `EXPENSE_NOT_FOUND`; rutas `PUT`/`DELETE /expenses/:id` (204).
- **owner-panel**: contrato `update`/`remove` + `ExpenseNotFoundError` (mock + HTTP), `CreateExpenseInput.date`; mock ordena por fecha desc; `currentDay()` en `lib/currentMonth.ts`; `ExpensesPage` con fecha, monto entero, edición en el mismo formulario y borrado con confirmación; textos es/en.

## Constitution Check

I ✅ contrato + mock + HTTP · II ✅ la fecha válida la decide el servidor · V ✅ unit del service, e2e, tests del repositorio y del HTTP, integración de rutas, recorrido en navegador · VII ✅ CLAUDE.md de backend y owner-panel, spec 041.
