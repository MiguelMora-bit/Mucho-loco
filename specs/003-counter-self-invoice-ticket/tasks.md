---

description: "Task list for Clave de autofactura en el ticket de mostrador"
---

# Tasks: Clave de autofactura en el ticket de mostrador

**Input**: `specs/003-counter-self-invoice-ticket/` · **Tests**: sí (principio V).

## Phase 1: Setup

- [X] T001 [P] Agregar `SelfInvoiceStatus` y `CounterTicket` a `packages/types/src/index.ts` exactamente como en `contracts/tickets.md`.
- [X] T002 [P] Agregar `qrcode.react` (misma versión que `apps/customer-app/package.json`) a `apps/branch-app/package.json` sin excepciones nuevas de `minimumReleaseAgeExclude`.
- [X] T003 [P] Agregar `TICKET_NOT_FOUND` (`ticketNotFound(kind, sourceId)`) a `apps/backend/src/common/error-codes.ts`.

## Phase 2: Foundational (backend)

- [X] T004 [P] Unit (fallando) de `selfInvoiceOf(receipt, configured)` en `apps/backend/src/invoicing/fiscal-mapping.spec.ts`: tabla R2 de `research.md` completa (pending configurado → pending; pending sin configurar/failed/canceled/null → unavailable; open con key → ready con key/url/expiresAt ISO; invoiced_to_customer/invoiced_globally → invoiced).
- [X] T005 Implementar `selfInvoiceOf` y `toCounterTicket(charge, kind, sourceId, configured)` en `apps/backend/src/invoicing/fiscal-mapping.ts` (líneas con `unitPriceCents/100`, `total = totalCents/100`, `paidAt` ISO, `branchName` del branch). Hace pasar T004. (depende de T001, T004)
- [X] T006 [P] e2e (fallando) en `apps/backend/test/invoicing.e2e-spec.ts` (`describe('counter tickets')`): venta de mostrador vía `POST /branches/1/counter-sales` → `GET /branches/1/tickets/sale/:id` 200 con renglones y total, `selfInvoice.status` `pending`; tras `worker.processDue()` con Facturapi simulado → `ready` con `key`/`url`; `GET /branches/2/tickets/sale/:id` → 404 `TICKET_NOT_FOUND`; `kind` inválido → 400; un socio sin rol → 403; alta de membresía en mostrador → ticket `membership`.
- [X] T007 `apps/backend/src/invoicing/tickets.service.ts` + `tickets.controller.ts` (`@Controller('branches/:branchId/tickets')`, `@Roles('staff')`, `ParseIntPipe`, `ParseEnumPipe({sale, membership})`), busca `Charge` por `counterSaleId`/`membershipPaymentId` con `branchId`, incluye `lines`, `fiscalReceipt`, `branch`; registrarlo en `invoicing.module.ts`. Hace pasar T006. (depende de T003, T005, T006)

## Phase 3: User Story 1 - Ticket al cobrar (P1) 🎯 MVP

**Independent Test**: vender en `/counter` (mock) → ticket con "clave en proceso" → en segundos clave + QR; "Imprimir" deja solo el ticket.

- [X] T008 [P] [US1] Tests (fallando) en `apps/branch-app/src/lib/datasources/http/ticket.http.test.ts`: `GET /branches/:id/tickets/:kind/:sourceId` con token y `?lang=`, id escapado, 404 con `TICKET_NOT_FOUND` → `TicketNotFoundError`, 500 se propaga.
- [X] T009 [P] [US1] Tests (fallando) en `apps/branch-app/src/lib/datasources/mock/ticket.mock.test.ts` y `apps/branch-app/src/lib/ticketPolling.test.ts`: el mock arma el ticket de una venta/pago existente del mock (`COUNTER_SALES`/`MEMBERSHIP_PAYMENTS`), `pending` antes de 4 s desde `createdAt` y `ready` después con clave `ML-` + 8 caracteres y URL `https://factura.space/mucholoco/<clave>`; otra sucursal → `TicketNotFoundError`. `nextPollDelay(status, elapsedMs)` → 3000 mientras `pending` y `elapsedMs < 90000`, `null` en cualquier otro caso.
- [X] T010 [US1] Implementar `apps/branch-app/src/lib/repositories/ticket.repository.ts` (`ITicketRepository`, `TicketNotFoundError`, singleton mock/HTTP con `isHttpDataSource` como los otros), `datasources/mock/ticket.mock.ts`, `datasources/http/ticket.http.ts`, `lib/ticketPolling.ts`. Hace pasar T008, T009. (depende de T001, T008, T009)
- [X] T011 [P] [US1] Textos `ticket.*` en `apps/branch-app/src/lib/locales/{es,en}.json`: título, fecha, forma de pago por método, total, "¿Necesitas factura?", instrucciones, clave, "Factura hasta el …", "Clave en proceso…", "Factura no disponible por ahora; pídela en sucursal", "Este cobro ya se facturó", Imprimir, Actualizar, Cerrar, Ver ticket.
- [X] T012 [US1] `apps/branch-app/src/components/CounterTicket.tsx`: carga con `ticketRepository` + polling (`nextPollDelay`), pinta el ticket en `#ticket` (sucursal, `formatDateTime`, renglones, total con centavos, método), sección de factura según `selfInvoice.status` con `QRCodeSVG` de `qrcode.react` para `url`; botones Imprimir (`window.print()`), Actualizar (al agotar el polling) y Cerrar. `@media print` en `apps/branch-app/src/index.css`: oculta todo menos `#ticket`, `@page { size: 80mm auto; margin: 4mm }`. (depende de T002, T010, T011)
- [X] T013 [US1] Mostrar `CounterTicket` al confirmar una venta en `apps/branch-app/src/routes/CounterSalePage.tsx` (kind `sale`, id de la venta devuelta) y al confirmar alta/renovación en la pestaña de membresías (`apps/branch-app/src/routes/counter/*`, kind `membership`, id del `MembershipPayment`). (depende de T012)

## Phase 4: User Story 2 - Reimprimir desde el corte (P2)

- [X] T014 [US2] En `apps/branch-app/src/routes/CashRegisterPage.tsx`, "Ver ticket" en transacciones `sale`/`membership` (no en `pickup`) que abre `CounterTicket` en un modal. (depende de T012)

## Phase 5: Polish

- [X] T015 [P] Documentar en `apps/branch-app/CLAUDE.md` ("Ticket con autofactura") y en `apps/backend/CLAUDE.md` (endpoint de tickets; branch-app hecho en "Facturación CFDI → Pendiente").
- [X] T016 Validación: backend unit + e2e, branch-app test/`tsc -b`/lint/build, integración de ruta contra backend local (`tests/integration`, 401 no 404).

## Dependencies

Setup → backend (T004–T007) ∥ frontend (T008–T011) → T012 → T013/T014 → Polish.
