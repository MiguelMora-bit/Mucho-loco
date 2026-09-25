---

description: "Task list for Facturas (CFDI) en el panel del dueño"
---

# Tasks: Facturas (CFDI) en el panel del dueño

## Phase 1: Backend

- [X] T001 Unit de `mexicoMonthRange` en `apps/backend/src/invoicing/fiscal-mapping.spec.ts` (rango UTC, día 31 23:00 local, meses inválidos) e implementación en `fiscal-mapping.ts`.
- [X] T002 `?month=` en `GET /invoicing/cfdis` (`invoicing.controller.ts`, 400 si inválido) y `listCfdis(range?)` sin tope de 200 con mes (`invoicing.service.ts`); aserciones e2e en `apps/backend/test/invoicing.e2e-spec.ts` (mes actual contiene las del test, mes vacío `[]`, mes inválido 400).

## Phase 2: Foundational (owner-panel)

- [X] T003 [P] `apps/owner-panel/src/lib/repositories/invoicing.errors.ts` (`CancellationRejectedError` con `detail`, `CfdiAlreadyCanceledError`, `InvoicingUnavailableError`) e `invoicing.repository.ts` (contrato de `contracts/owner-invoicing.md`, singleton mock/HTTP).
- [X] T004 [P] Tests (fallando) `apps/owner-panel/src/lib/datasources/http/invoicing.http.test.ts`: rutas, `?month=`, `?lang=`, token, id escapado, 409/422/503/502 → errores tipados (422 con `detail`), 500 se propaga, descarga binaria.
- [X] T005 [P] Tests (fallando) `apps/owner-panel/src/lib/datasources/mock/invoicing.mock.test.ts`: lista del mes (orden desc, solo ese mes en hora CDMX), resumen, cancelar vigente → `canceled`, cancelada → `CfdiAlreadyCanceledError`, folio de prueba que el "SAT" rechaza → `CancellationRejectedError`, descarga PDF/XML.
- [X] T006 Implementar `datasources/http/invoicing.http.ts` y `datasources/mock/invoicing.mock.ts` (seed de ~8 CFDI en el mes actual y el anterior, individuales y globales, con un fallido en el resumen). Hace pasar T004–T005.
- [X] T007 [P] `apps/owner-panel/src/lib/cfdiCsv.ts` (+ `cfdiCsv.test.ts`): BOM, encabezados es/en, escape de comas/comillas/saltos, total con 2 decimales, fecha local; `apps/owner-panel/src/lib/currentMonth.ts` (mes actual en CDMX, `YYYY-MM`, con test).

## Phase 3: US1 - Ver y buscar (P1) 🎯

- [X] T008 [US1] Textos `invoicing.*` en `apps/owner-panel/src/lib/locales/{es,en}.json` y `nav.invoicing`.
- [X] T009 [US1] `apps/owner-panel/src/routes/InvoicingPage.tsx`: selector de mes (`<input type="month">`, default `currentMonth()`), búsqueda por folio/RFC/nombre, tabla (folio, tipo, fecha, RFC, nombre, total con centavos, estado + cancelación), PDF/XML (Blob + `<a download>`), vacío, error con reintentar. Ruta `/invoicing` en `App.tsx` y enlace en `components/layout/AppShell.tsx`.

## Phase 4: US2 - Cancelar (P1)

- [X] T010 [US2] En `InvoicingPage.tsx`: "Cancelar" solo en vigentes; diálogo con motivo 02/03 explicado y confirmar; éxito → recarga lista y resumen; `CancellationRejectedError` → motivo tal cual; `CfdiAlreadyCanceledError` → recarga; `InvoicingUnavailableError` → mensaje; otro → genérico.

## Phase 5: US3 - Resumen y exportación (P2)

- [X] T011 [US3] Tarjetas del resumen (fallidos resaltados) y botón Exportar CSV del mes (`cfdiCsv`, nombre `facturas-YYYY-MM.csv`).

## Phase 6: Polish

- [X] T012 [P] Integración de rutas nuevas en `apps/owner-panel/src/lib/datasources/http/hq.integration.test.ts` (401, no 404).
- [X] T013 [P] Documentar en `apps/owner-panel/CLAUDE.md` y `apps/backend/CLAUDE.md` (owner-panel hecho; `?month=`).
- [X] T014 Validación: backend unit/e2e, owner-panel test/`tsc -b`/lint/build.
