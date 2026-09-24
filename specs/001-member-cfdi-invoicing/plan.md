# Implementation Plan: Facturación del socio (CFDI) en la web

**Branch**: `001-member-cfdi-invoicing` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-member-cfdi-invoicing/spec.md`

## Summary

El socio factura sus cobros desde una página propia `/invoicing` del panel de customer-app:
captura sus datos fiscales (con el uso de CFDI filtrado por régimen), ve sus cobros con su
estado, emite el CFDI de uno, descarga PDF/XML y, si la factura salió mal, abre WhatsApp de
soporte con el folio. El backend ya hace el trabajo fiscal; este plan agrega el contrato
`IInvoicingRepository` en `@mucho-loco/customer-core` (mock + HTTP, compartible con mobile-app),
dos métodos al cliente HTTP compartido (`put`, `getFile`), tres Route Handlers y la página.
Único cambio de backend: exponer el folio (`invoice.uuid`) en la lista de cobros.

## Technical Context

**Language/Version**: TypeScript 6 (strict), Node 22 (CI)

**Primary Dependencies**: Next.js 15.5 App Router + next-intl + Tailwind v3 (customer-app);
`@mucho-loco/customer-core`, `@mucho-loco/api-client`, `@mucho-loco/types`; NestJS + Prisma 6
(solo el ajuste de `getCharges`)

**Storage**: N/A en el frontend. Backend: Postgres, sin migración (los datos ya existen)

**Testing**: Vitest (packages + customer-app), Playwright (customer-app, contra mock), Jest e2e
contra Postgres real (backend), integración de rutas contra backend local

**Target Platform**: Web (Vercel); navegadores de escritorio y móvil

**Project Type**: Monorepo web — frontend Next.js + paquetes compartidos + backend NestJS

**Performance Goals**: SC-001 — facturar en < 1 min y ≤ 3 interacciones; la página carga con
una sola ronda de lecturas en paralelo desde el servidor

**Constraints**: mock-first (mock es el default y se ve igual que HTTP); la cookie de sesión
solo se lee en el servidor; ninguna identidad ni importe viaja del navegador; es/en

**Scale/Scope**: 1 página nueva, 3 Route Handlers, 1 repositorio con 5 métodos, hasta 100
cobros por socio (tope del backend)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Contract-first, mock-first | `IInvoicingRepository` primero; mock con los 4 estados y todos los rechazos (incluido el del SAT); mock es el default; la UI solo ve el contrato | ✅ |
| II. Backend = verdad del dinero e identidad | Identidad por token (HTTP ignora `email`); el navegador no manda importes; errores por código de máquina; un 500 o red caída no se traduce | ✅ |
| III. Lógica compartida en `packages/` | Contrato, datasources, errores, catálogo fiscal y `formatMoney` en customer-core; `put`/`getFile` en api-client — nada se duplica | ✅ |
| IV. Fechas ISO e idioma al pintar | `paidAt` ISO formateado al pintar; textos en `messages/{es,en}`; descripción del cobro y motivo del SAT se muestran tal cual (recibo congelado) | ✅ |
| V. Pruebas contra lo real | Unit en paquetes y app; e2e de backend contra Postgres para `uuid`; Playwright de los flujos; integración de rutas contra backend local | ✅ |
| VI. Simplicidad | Sin servicios nuevos; sin Server Actions (patrón nuevo); un solo endpoint de backend tocado | ✅ |
| VII. Decisiones documentadas | `apps/customer-app/CLAUDE.md` (sección Facturar) y `apps/backend/CLAUDE.md` (pendiente de frontends) se actualizan; "sin probar contra Facturapi" se mantiene | ✅ |
| Flujo: un spec por app | Toca customer-app + ajustes aditivos en types/api-client/customer-core/backend que el contrato obliga (R3, R7) | ✅ justificado abajo |

**Post-diseño (tras Fase 1)**: se re-evaluó con data-model y contratos; sin violaciones nuevas.

## Project Structure

### Documentation (this feature)

```text
specs/001-member-cfdi-invoicing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── invoicing-repository.md
│   ├── route-handlers.md
│   └── shared-packages-delta.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/types/src/index.ts                     # MemberCharge.invoice.uuid
packages/api-client/src/
├── index.ts                                    # put, getFile, ApiFile
└── index.test.ts
packages/customer-core/
├── package.json                                # exports ./fiscal, ./invoicing-errors
├── messages/{es,en}.json                       # namespace invoicing
└── src/
    ├── contract.ts                             # IInvoicingRepository, InvoiceFile
    ├── fiscal.ts / fiscal.test.ts              # catálogo, filtro, validación
    ├── invoicing-errors.ts                     # InvoicingError, invoicingErrorOf
    ├── pricing.ts                              # formatMoney
    ├── mock/invoicing.mock.ts (+ index.ts)
    └── http/invoicing.http.ts (+ index.ts, http.test.ts)
apps/backend/
├── src/invoicing/{invoicing.service.ts,fiscal-mapping.ts}   # uuid
└── test/invoicing.e2e-spec.ts
apps/customer-app/
├── lib/
│   ├── auth.ts                                 # PROTECTED_PATHS += /invoicing
│   ├── contact.ts                              # WHATSAPP (movido de Contact.tsx)
│   └── repositories/invoicing.repository.ts (+ .test.ts)
├── app/[locale]/(account)/invoicing/page.tsx
├── app/api/invoicing/
│   ├── fiscal-profile/route.ts
│   ├── charges/[chargeId]/invoice/route.ts
│   └── invoices/[cfdiId]/[format]/route.ts
├── components/invoicing/                       # InvoicingClient, FiscalProfileForm,
│                                               # ChargeList, InvoiceConfirm
├── components/dashboard/Sidebar.tsx            # acceso a /invoicing
├── components/landing/Contact.tsx              # importa WHATSAPP de lib/contact
├── tests/e2e/invoicing.spec.ts
└── CLAUDE.md
```

**Structure Decision**: la estructura existente del monorepo. Lo compartible con mobile-app va
a `packages/customer-core` (patrón de `payment`/`membership`); lo específico de Next (página,
Route Handlers, componentes) queda en `apps/customer-app`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| El spec toca más que customer-app (types, api-client, customer-core, backend) | El contrato lo obliga: el cliente HTTP no sabe PUT ni binarios (R3) y la lista no trae el folio que pide FR-020 (R7) | `fetch` crudo en el handler duplica timeout/token/errores; omitir el folio deja a HQ sin con qué buscar la factura |
