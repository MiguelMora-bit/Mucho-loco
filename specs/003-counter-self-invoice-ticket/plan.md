# Implementation Plan: Clave de autofactura en el ticket de mostrador

**Branch**: `003-counter-self-invoice-ticket` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

## Summary

Endpoint de backend que arma el ticket de un cobro de mostrador desde el registro de cobros, con el estado de su autofactura; en branch-app, componente `CounterTicket` (QR + clave + imprimir) que aparece al cobrar y desde el corte de caja, con polling mientras la clave está en proceso.

## Technical Context

TypeScript 6 · NestJS + Prisma 6 (backend) · Vite + React 19 + react-router + Zustand + react-i18next + Tailwind (branch-app) · `qrcode.react` (nueva en branch-app) · Vitest / Jest e2e contra Postgres · Target: navegador de mostrador · Constraints: nunca bloquear el cobro; mock-first · Scope: 1 endpoint, 1 tipo, 1 repositorio, 1 componente, 3 integraciones.

## Constitution Check

| Principio | Cumplimiento | Estado |
|---|---|---|
| I | Repositorio mock/HTTP; mock simula `pending → ready` | ✅ |
| II | Ticket desde `Charge` (verdad del dinero); montos del servidor | ✅ |
| III | Tipo `CounterTicket` en `@mucho-loco/types`; cliente HTTP compartido | ✅ |
| IV | `paidAt`/`expiresAt` ISO, formato al pintar; textos es/en | ✅ |
| V | e2e contra Postgres + unit de datasource/mapeo | ✅ |
| VI | Sin impresoras ni SSE: `window.print()` + polling | ✅ |
| VII | CLAUDE.md de backend y branch-app | ✅ |

## Project Structure

```text
packages/types/src/index.ts                         # CounterTicket, SelfInvoiceStatus
apps/backend/src/invoicing/
├── tickets.controller.ts / tickets.service.ts (+ .spec.ts)
├── fiscal-mapping.ts                               # selfInvoiceOf()
└── invoicing.module.ts
apps/backend/src/common/error-codes.ts              # TICKET_NOT_FOUND
apps/backend/test/invoicing.e2e-spec.ts             # tickets
apps/branch-app/
├── package.json                                    # qrcode.react
├── src/lib/repositories/ticket.repository.ts (+ test)
├── src/lib/datasources/{mock,http}/ticket.*.ts (+ test)
├── src/lib/ticketPolling.ts (+ test)
├── src/components/CounterTicket.tsx
├── src/index.css                                   # @media print
├── src/routes/CounterSalePage.tsx, src/routes/counter/*, src/routes/CashRegisterPage.tsx
├── src/lib/locales/{es,en}.json
└── CLAUDE.md
```

## Complexity Tracking

Sin violaciones.
