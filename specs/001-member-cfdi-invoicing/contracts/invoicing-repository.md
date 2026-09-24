# Contract: `IInvoicingRepository` (`@mucho-loco/customer-core/contract`)

Lo implementan `InvoicingMockDatasource` (`./mock`) e `InvoicingHttpDatasource` (`./http`).
Mismo criterio que `IUserRepository`: `email` está en la firma porque el mock lo necesita para
saber de quién son los datos; el HTTP lo ignora y manda el ID token de la sesión.

```ts
export interface InvoiceFile {
  data: Uint8Array;
  contentType: string;
  filename: string;
}

export interface IInvoicingRepository {
  /** `null` = todavía no captura datos fiscales (no es un error). */
  getFiscalProfile(email: string): Promise<FiscalProfile | null>;

  /** Guarda (crea o reemplaza) y devuelve lo guardado, ya normalizado. */
  saveFiscalProfile(email: string, profile: FiscalProfile): Promise<FiscalProfile>;

  /** Sus cobros, más reciente primero, con estado de facturación. */
  getCharges(email: string): Promise<MemberCharge[]>;

  /**
   * Emite el CFDI del cobro con los datos fiscales guardados. El PAC manda PDF y XML por
   * correo. Rechazos: leer con `invoicingErrorOf()` de `./invoicing-errors`.
   */
  invoiceCharge(email: string, chargeId: string): Promise<Cfdi>;

  /** Solo facturas individuales del socio. */
  downloadInvoice(email: string, cfdiId: string, format: 'pdf' | 'xml'): Promise<InvoiceFile>;
}
```

## Mapeo HTTP (`InvoicingHttpDatasource`)

| Método | Backend | Cliente |
|---|---|---|
| `getFiscalProfile` | `GET /users/me/fiscal-profile` | `getOrNull` (404 `FISCAL_PROFILE_NOT_FOUND` → `null`) |
| `saveFiscalProfile` | `PUT /users/me/fiscal-profile` | `put` (**nuevo** en api-client) |
| `getCharges` | `GET /users/me/charges` | `get` |
| `invoiceCharge` | `POST /users/me/charges/:chargeId/invoice` | `post` |
| `downloadInvoice` | `GET /users/me/invoices/:cfdiId/:format` | `getFile` (**nuevo** en api-client) |

Ids en la ruta van con `encodeURIComponent`.

## Errores (`@mucho-loco/customer-core/invoicing-errors`)

```ts
export type InvoicingErrorCode =
  | 'FISCAL_PROFILE_REQUIRED'   // 400 — facturar sin datos fiscales
  | 'CHARGE_NOT_FOUND'          // 404 — no existe o no es suyo (mismo trato)
  | 'CHARGE_ALREADY_INVOICED'   // 409 — ya tiene CFDI (app o portal)
  | 'INVOICING_WINDOW_CLOSED'   // 409 — ya entró a la global
  | 'CHARGE_NOT_INVOICEABLE'    // 409 — sin recibo / recibo cancelado
  | 'INVOICING_UNAVAILABLE'     // 503 — facturación apagada
  | 'FISCAL_DATA_REJECTED'      // 422 — el SAT rechazó; `detail` = motivo
  | 'INVOICING_PROVIDER_ERROR'  // 502 — el PAC no respondió
  | 'CFDI_NOT_FOUND';           // 404 — descarga de algo que no es suyo

export class InvoicingError extends Error {
  readonly code: InvoicingErrorCode;
  readonly detail?: string;     // solo FISCAL_DATA_REJECTED
}

/** Código + detalle, venga del mock o del backend; `null` si no es de negocio. */
export function invoicingErrorOf(e: unknown): { code: InvoicingErrorCode; detail?: string } | null;
```

Cualquier otro error (500, `status: 0` de red/timeout, 401) se propaga sin traducir.

## Comportamiento que el mock MUST imitar

- Cada correo arranca sin datos fiscales y con 5 cobros: 2 `available`, 1 `invoiced` (con
  `cfdiId` y `uuid`), 1 `closed`, 1 `unavailable`.
- `invoiceCharge` sin datos fiscales → `FISCAL_PROFILE_REQUIRED`; cobro ajeno o inexistente →
  `CHARGE_NOT_FOUND`; `invoiced` → `CHARGE_ALREADY_INVOICED`; `closed` →
  `INVOICING_WINDOW_CLOSED`; `unavailable` → `CHARGE_NOT_INVOICEABLE`.
- RFC `XAXX010101000` → `FISCAL_DATA_REJECTED` con un motivo en el estilo del SAT; el cobro
  sigue `available`.
- Facturar con éxito pasa el cobro a `invoiced` con un `uuid` nuevo (forma de UUID v4).
- `downloadInvoice` de un `cfdiId` que no es de sus cobros `invoiced` → `CFDI_NOT_FOUND`.
- `saveFiscalProfile` normaliza (mayúsculas, trim) igual que el backend y devuelve lo guardado.
