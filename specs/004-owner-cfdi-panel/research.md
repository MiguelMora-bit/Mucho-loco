# Research: Facturas (CFDI) en el panel del dueño

- **R1. Filtro por mes en el backend** — `GET /invoicing/cfdis?month=YYYY-MM` trae el mes completo en hora de CDMX (`mexicoMonthRange`, UTC-6 fijo desde 2022); sin `month` sigue la vista rápida de 200. Alternativa rechazada: paginar (más complejo, y la exportación quiere el mes entero).
- **R2. CSV en el navegador** — `lib/cfdiCsv.ts` (puro, con test): UTF-8 con BOM (Excel en español lo abre con acentos), coma, comillas dobles escapadas, fechas ISO locales, total con 2 decimales. Alternativa rechazada: endpoint de exportación (los datos ya están en la lista del mes).
- **R3. Repositorio con errores tipados** — `invoicing.errors.ts`: `CancellationRejectedError(detail)`, `CfdiAlreadyCanceledError`, `InvoicingUnavailableError` (503 o PAC caído 502). Mismo patrón que `shipments.errors.ts`.
- **R4. Descargas** — `api.getFile` de `@mucho-loco/api-client` (spec 001) + Blob + `<a download>`.
- **R5. Estado** — la página pide lista del mes y resumen con `useEffect` y estado local; tras cancelar vuelve a pedir la lista (criterio del panel).
- **R6. Pruebas** — backend: unit de `mexicoMonthRange` + e2e del filtro; owner-panel: Vitest de HTTP (rutas, `?month=`, códigos → errores), mock, CSV; integración de rutas (401) en `hq.integration.test.ts`. UI en navegador necesita User Pool.
