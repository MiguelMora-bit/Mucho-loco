# Contract: tickets de mostrador

## Backend

`GET /branches/:branchId/tickets/:kind/:sourceId?lang=es|en` — `@Roles('staff')`

- `kind`: `sale` | `membership` (otro → 400).
- 404 `{ code: 'TICKET_NOT_FOUND' }` si el cobro no existe o es de otra sucursal.

```ts
// @mucho-loco/types
export type SelfInvoiceStatus = 'pending' | 'ready' | 'invoiced' | 'unavailable';

export interface CounterTicket {
  kind: 'sale' | 'membership';
  sourceId: string;
  branchName: string;
  /** ISO — instante del cobro. */
  paidAt: string;
  lines: { description: string; qty: number; unitPrice: number }[];
  /** Pesos con centavos, IVA incluido. */
  total: number;
  method: ChargeMethodKey; // 'cash' | 'card' | 'card_credit' | 'card_debit' | 'oxxo' | 'spei' | 'transfer'
  selfInvoice: {
    status: SelfInvoiceStatus;
    key: string | null;
    url: string | null;
    /** ISO; hasta cuándo deja autofacturar el portal. */
    expiresAt: string | null;
  };
}
```

## branch-app

```ts
// src/lib/repositories/ticket.repository.ts
export interface ITicketRepository {
  getTicket(kind: 'sale' | 'membership', sourceId: string, branchId: number): Promise<CounterTicket>;
}
export class TicketNotFoundError extends Error {}
```
