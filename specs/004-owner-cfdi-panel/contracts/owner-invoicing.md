# Contract: facturas en owner-panel

Backend (`@Roles('owner')`): `GET /invoicing/cfdis?month=YYYY-MM` (400 si el mes no es válido) · `GET /invoicing/summary` · `GET /invoicing/cfdis/:id/(pdf|xml)` · `POST /invoicing/cfdis/:id/cancel { motive: '02' | '03' }` (409 `CFDI_ALREADY_CANCELED`, 422 `CANCELLATION_REJECTED` con `detail`, 503 `INVOICING_UNAVAILABLE`, 502 `INVOICING_PROVIDER_ERROR`).

```ts
// apps/owner-panel/src/lib/repositories/invoicing.repository.ts
export interface CfdiFile { data: Uint8Array; contentType: string; filename: string }
export interface IInvoicingRepository {
  listCfdis(month: string): Promise<Cfdi[]>;
  getSummary(): Promise<InvoicingSummary>;
  cancel(cfdiId: string, motive: CfdiCancellationMotive): Promise<Cfdi>;
  download(cfdiId: string, format: 'pdf' | 'xml'): Promise<CfdiFile>;
}
```
