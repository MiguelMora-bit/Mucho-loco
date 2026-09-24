# Contract: facturación en mobile-app

Sin contrato nuevo de datos: `IInvoicingRepository` de customer-core (ver
`specs/001-member-cfdi-invoicing/contracts/invoicing-repository.md`).

## Nuevo en customer-core

```ts
// @mucho-loco/customer-core/contact
export const WHATSAPP: { number: string; display: string };
export function whatsappUrl(text: string): string;
```

## Nuevo en mobile-app

```ts
// src/lib/repositories.ts
export const invoicingRepository: IInvoicingRepository;

// src/lib/share-file.ts (+ .web.ts)
/** iOS/Android: hoja de compartir; web: descarga. Tira si no se puede compartir. */
export function shareInvoiceFile(file: InvoiceFile): Promise<void>;
```

## Pantalla `invoicing` (`src/app/invoicing.tsx`)

- Stack, título `t.invoicing.title`. Acceso: botón `t.dashboard.nav.invoicing` en el panel de Cuenta.
- Sin sesión: mensaje + botón a `/login`.
- `?charge=<id>` no aplica (sin deep link en este alcance).
