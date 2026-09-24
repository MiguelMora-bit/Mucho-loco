# Data Model: Facturación del socio (CFDI) en la web

No hay tablas nuevas: el backend ya persiste todo (`FiscalProfile`, `Charge`, `FiscalReceipt`,
`Cfdi`). Aquí están las formas que cruzan el contrato, en `@mucho-loco/types`, y las reglas
que las rigen del lado del frontend.

## FiscalProfile (existe — sin cambios)

| Campo | Tipo | Regla |
|---|---|---|
| `taxId` | string | RFC. Mayúsculas, sin espacios. `^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$` (12 = moral, 13 = física). |
| `legalName` | string | Mayúsculas, sin espacios sobrantes, ≤ 254. Sin régimen societario (texto de ayuda, no validación). |
| `taxSystem` | string | Una clave de `TAX_SYSTEMS` (19 regímenes vigentes para receptor, igual que el DTO del backend). |
| `zip` | string | `^\d{5}$`. |
| `cfdiUse` | `'G01' \| 'G03' \| 'S01'` | MUST estar en `allowedCfdiUses(taxSystem)`. |
| `email` | string \| null | Forma de correo si viene. `null` = correo de la cuenta. |

Uno por socio. Editar no toca facturas ya emitidas (el CFDI congela los datos al timbrar).
"Sin datos fiscales" se representa como `null` en el contrato del frontend, no como error.

## MemberCharge (existe — **cambio aditivo**: `invoice.uuid`)

| Campo | Tipo | Nota |
|---|---|---|
| `id` | string | |
| `paidAt` | string (ISO) | Instante → se pinta en hora local. |
| `total` | number | Pesos con centavos, IVA incluido → `formatMoney` (2 decimales). |
| `description` | string | Ya viene armada del backend; recibo congelado, no se traduce. |
| `invoice.status` | `ChargeInvoiceStatus` | Ver transiciones abajo. |
| `invoice.cfdiId` | string \| null | Id interno. Solo se usa para descargar cuando `status === 'invoiced'`. |
| `invoice.uuid` | string \| null | **Nuevo.** Folio fiscal del SAT; solo con `status === 'invoiced'`. Va en el mensaje de WhatsApp. |

Orden: más reciente primero (el backend ya ordena por `paidAt desc`, tope 100).

### Estado de facturación → lo que ve el socio

| `invoice.status` | Etiqueta (es) | Acciones |
|---|---|---|
| `available` | Facturable | Facturar |
| `invoiced` | Facturado | Descargar PDF, Descargar XML, ¿Datos incorrectos? |
| `closed` | Ya no facturable | — (explica que entró a la factura global) |
| `unavailable` | No facturable | — (explica que el cobro no tiene recibo fiscal) |

### Transiciones (quién las provoca)

```text
available ──(socio factura en la app)──────────────▶ invoiced
available ──(socio se autofactura en el portal)─────▶ invoiced
available ──(cierre de periodo: factura global)─────▶ closed
invoiced  ──(HQ cancela la factura, motivo 02/03)───▶ available
(recibo cancelado)                                   unavailable
```

El frontend solo provoca la primera. Las demás pasan fuera y el frontend las descubre al
releer la lista (o como rechazo `CHARGE_ALREADY_INVOICED` / `INVOICING_WINDOW_CLOSED`).

## Cfdi (existe — sin cambios)

Lo devuelve `invoiceCharge`. El frontend usa `uuid` y, para el aviso de FR-012, el correo de
destino lo calcula él: `fiscalProfile.email ?? correo de la cuenta`.

## InvoiceFile (nuevo, solo frontend)

| Campo | Tipo | Nota |
|---|---|---|
| `data` | Uint8Array | Bytes del PDF o XML. |
| `contentType` | string | `application/pdf` / `application/xml`. |
| `filename` | string | Del `Content-Disposition` del backend; si no viene, `factura-<uuid>.<ext>`. |

## Catálogo fiscal (nuevo, `@mucho-loco/customer-core/fiscal`)

- `TAX_SYSTEMS: { key: string; name: LocalizedString }[]` — 601, 603, 605, 606, 607, 608, 610,
  611, 612, 614, 615, 616, 620, 621, 622, 623, 624, 625, 626.
- `CFDI_USES: { key: CfdiUse; name: LocalizedString }[]` — G01, G03, S01.
- `allowedCfdiUses(taxSystem)`: G01/G03/S01 para 601, 603, 606, 612, 620–626; solo S01 para
  605, 607, 608, 610, 611, 614, 615, 616.
- `normalizeFiscalText(s)`, `isRfcShape(s)`, `isZipShape(s)`, `validateFiscalProfile(input)` →
  errores por campo (`taxId`, `legalName`, `taxSystem`, `zip`, `cfdiUse`, `email`).
