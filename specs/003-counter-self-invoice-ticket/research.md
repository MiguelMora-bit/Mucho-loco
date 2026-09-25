# Research: Clave de autofactura en el ticket de mostrador

## R1. De dónde sale el ticket

- **Decision**: el backend arma el ticket desde el registro de cobros (`Charge` + `ChargeLine` + `FiscalReceipt`), no desde `CounterSale`/`MembershipPayment`. Endpoint nuevo `GET /branches/:branchId/tickets/:kind/:sourceId` (`kind` = `sale` | `membership`; `sourceId` = el id de la venta o del pago, el mismo que ya trae `ShiftTransaction.id` y la respuesta de cada cobro).
- **Rationale**: principio II — el cobro registrado es la fuente de verdad del dinero y de lo facturable; los renglones ya tienen descripción, cantidad y precio congelados. No hay que agregar `chargeId` a los tipos de venta/pago: el corte de caja ya expone el id de origen.
- **Alternatives**: agregar `chargeId` a `CounterSale`/`MembershipPayment` (toca tres tipos y los mocks); endpoint por `chargeId` (el frontend no lo conoce).

## R2. Estado de autofactura

| `FiscalReceipt` | `selfInvoice.status` |
|---|---|
| `pending` (facturación configurada) | `pending` |
| `pending` con facturación apagada, `failed`, `canceled`, sin recibo | `unavailable` |
| `open` con `key` | `ready` (+ `key`, `url`, `expiresAt`) |
| `invoiced_to_customer`, `invoiced_globally` | `invoiced` |

- **Rationale**: el staff solo necesita 4 casos; "apagada" se detecta con `FacturapiService.configured` (sin llave el worker nunca corre y el recibo se quedaría `pending` para siempre).

## R3. Seguridad

- **Decision**: `@Roles('staff')` y el cobro MUST pertenecer a `:branchId` (si no, 404 `TICKET_NOT_FOUND`, igual que uno que no existe). Mismo nivel de autorización que el resto de rutas de sucursal.

## R4. Frontend: repositorio + polling

- **Decision**: `ticketRepository.getTicket(kind, sourceId, branchId)` en branch-app (mock + HTTP, mismo patrón que los otros 6). Hook `useTicket` pide cada 3 s mientras `status === 'pending'`, hasta 90 s (SC-001); después deja de pedir y ofrece "Actualizar". El mock devuelve `pending` los primeros ~4 s de vida del cobro y luego `ready` con una clave falsa, para ejercitar el flujo.
- **Alternatives**: SSE/websocket (infra nueva, principio VI); pedir una sola vez (FR-003).

## R5. QR e impresión

- **Decision**: `qrcode.react` (la misma librería que usa customer-app) para el QR de `selfInvoiceUrl`. Impresión con `window.print()` y CSS `@media print` que oculta todo menos `#ticket` y fija `@page { size: 80mm auto; margin: 4mm }`.
- **Rationale**: principio VI — sin drivers de impresora; cualquier térmica instalada en el sistema imprime desde el diálogo.
- **Dependencia**: `qrcode.react` versión que ya cumple el candado de antigüedad del workspace (la misma que customer-app).

## R6. Pruebas

- Backend: unit del mapeo de estado; e2e en `test/invoicing.e2e-spec.ts` (o `branch-ops`): venta de mostrador → ticket `pending` → worker → `ready` con clave; otra sucursal → 404; membresía de mostrador → ticket.
- branch-app: Vitest del datasource HTTP (ruta, token, `?lang=`, 404 → error tipado), del mock y del mapeo; `useTicket` como lógica pura de polling (función `nextPollDelay`); Playwright solo con User Pool (como el resto del app) — se escribe el caso y se valida la UI con el build + render en dev con mock de auth si existiera; si no, queda documentado como pendiente de pool.
