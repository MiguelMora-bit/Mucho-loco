# Contract: cambios fuera de customer-app

Todos aditivos. Ningún consumidor existente cambia.

## `@mucho-loco/types`

```ts
export interface MemberCharge {
  // ...
  invoice: {
    status: ChargeInvoiceStatus;
    cfdiId: string | null;
    /** Folio fiscal del SAT. Solo con status 'invoiced' (la global no es del socio). */
    uuid: string | null;
  };
}
```

## `apps/backend` — `InvoicingService.getCharges` / `toMemberCharge`

- `include: { lines: true, fiscalReceipt: { include: { cfdi: true } } }`.
- `invoice.uuid = status === 'invoiced' ? fiscalReceipt.cfdi?.uuid ?? null : null`.
- Sin migración (`Cfdi.uuid` ya existe). e2e `invoicing.e2e-spec.ts`: el cobro facturado trae
  el `uuid` de su CFDI; uno en la global trae `uuid: null`.

## `@mucho-loco/api-client`

```ts
export interface ApiFile {
  data: Uint8Array;
  contentType: string;
  filename: string | null;   // de Content-Disposition
}

export interface ApiClient {
  // existentes: get, getOrNull, post
  put<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>;
  getFile(path: string, opts?: RequestOptions): Promise<ApiFile>;
}
```

- `put`: igual que `post` con método `PUT`.
- `getFile`: `Accept: */*`; lee `arrayBuffer()` dentro del timeout; un no-2xx se parsea como
  JSON para sacar `code` (mismo `ApiRequestError`); nunca cachea.

## `@mucho-loco/customer-core`

Nuevos exports en `package.json`: `./fiscal`, `./invoicing-errors`. `./contract`, `./mock`,
`./http` ganan el repositorio de facturación. `./pricing` gana `formatMoney(amount, lang)`.
Mensajes nuevos bajo `invoicing` en `messages/{es,en}.json`.
