# Contract: Route Handlers de customer-app (`app/api/invoicing/*`)

Los llama el navegador. Todos validan sesión con `getCurrentUserEmail()` (el middleware no cubre
`/api`) y responden `401 { error: 'UNAUTHORIZED' }` sin ella. Llaman a
`invoicingRepository` (mock o HTTP según `NEXT_PUBLIC_DATA_SOURCE`).

Un rechazo de negocio responde `{ error: InvoicingErrorCode, detail?: string, charges?: MemberCharge[] }`
con el status de la tabla. Todo lo demás se relanza (500 de Next): no se disfraza.

## `PUT /api/invoicing/fiscal-profile`

- Body: `FiscalProfile` (el `email` vacío se manda como `null`).
- El handler valida forma con `validateFiscalProfile` antes de llamar al repositorio; si falla,
  `400 { error: 'INVALID_FISCAL_PROFILE', fields: { taxId?: true, zip?: true, ... } }`.
- `200` → `FiscalProfile` guardado (normalizado).

## `POST /api/invoicing/charges/[chargeId]/invoice`

- Sin body.
- `200` → `{ cfdi: Cfdi, charges: MemberCharge[] }` (lista releída: el cobro ya sale `invoiced`).

| Rechazo | Status | `charges` en la respuesta |
|---|---|---|
| `FISCAL_PROFILE_REQUIRED` | 400 | no |
| `CHARGE_NOT_FOUND` | 404 | sí |
| `CHARGE_ALREADY_INVOICED` | 409 | sí |
| `INVOICING_WINDOW_CLOSED` | 409 | sí |
| `CHARGE_NOT_INVOICEABLE` | 409 | sí |
| `FISCAL_DATA_REJECTED` | 422 | no (con `detail`) |
| `INVOICING_UNAVAILABLE` | 503 | no |
| `INVOICING_PROVIDER_ERROR` | 502 | no |

## `GET /api/invoicing/invoices/[cfdiId]/[format]`

- `format` ∈ `pdf | xml`; otro valor → `400`.
- `200` → bytes con `Content-Type` del backend y
  `Content-Disposition: attachment; filename="<filename>"`, `Cache-Control: private, no-store`.
- `CFDI_NOT_FOUND` → `404`.

## Página `/[locale]/invoicing`

- Server Component en `app/[locale]/(account)/invoicing/page.tsx`: lee `getFiscalProfile` y
  `getCharges` en paralelo, más el perfil del socio (para su correo de cuenta).
- Sin sesión → `redirect('/account')`; además `/invoicing` entra a `PROTECTED_PATHS`.
- `?charge=<id>` abre directo la confirmación de ese cobro (lo usa el regreso de US2 escenario 5
  después de capturar datos fiscales).
