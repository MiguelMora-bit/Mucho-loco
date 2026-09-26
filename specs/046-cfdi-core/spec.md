# Feature Specification: Facturación CFDI 4.0 (núcleo del backend)

**Feature Branch**: `046-cfdi-core` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo del módulo `invoicing` del backend (2026-09-15): recibos en Facturapi por cada cobro, factura del socio, autofactura, factura global y cancelación. Los frontends son los specs 001–004.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Un solo RFC para las 15 sucursales: una organización de Facturapi, una llave, un certificado; lugar de expedición = domicilio de la matriz (2026-09-15).
- Modelo de **recibos** de Facturapi: cada cobro nace con su `FiscalReceipt` en `pending`, en la misma transacción; el cobro nunca llama al PAC.
- El recibo ES la cola: un cron cada minuto toma hasta 20 pendientes con `FOR UPDATE SKIP LOCKED` y los da de alta (`idempotency_key` = id del cobro); backoff de 2ⁿ minutos, 10 intentos y luego `failed`.
- El recibo trae clave y URL de autofactura (el ticket la imprime); el socio con app convierte su recibo en CFDI con sus datos fiscales; lo que nadie facturó entra a la factura global que emite Facturapi.
- Webhook de Facturapi con firma verificada; como con Stripe, no se aplica el evento: se relee el recibo o la factura.
- Si el PAC rechaza, primero se pregunta por qué: si ya se autofacturó o entró a la global → 409; si sigue abierto → 422 `FISCAL_DATA_REJECTED` con el motivo del SAT tal cual.
- Formas de pago: efectivo y OXXO `01`, SPEI `03`, crédito `04`, débito `28`. Cancelación desde HQ con motivos 02 y 03. Sin backfill de cobros anteriores. PDF y XML no se guardan: se piden a Facturapi.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cada cobro tiene su recibo (Priority: P1)

El recibo se da de alta en segundo plano y con reintentos, sin frenar el cobro.

**Independent Test**: `apps/backend/src/invoicing/fiscal-receipts.service.spec.ts`; `apps/backend/test/invoicing.e2e-spec.ts` (cola: se manda una vez, espera su turno si el PAC no contesta).

**Acceptance Scenarios**:

1. **Given** un cobro nuevo, **When** corre el cron, **Then** su recibo se da de alta una vez con la clave de autofactura.
2. **Given** Facturapi caído, **When** corre el cron, **Then** el recibo espera con backoff y a los 10 intentos queda `failed` (HQ lo ve).

### User Story 2 - El socio factura su cobro (Priority: P1)

Con sus datos fiscales, el socio convierte su recibo en CFDI y descarga PDF y XML.

**Independent Test**: `invoicing.e2e-spec.ts` (datos fiscales → factura → nunca dos veces, nunca la de otro); `apps/backend/src/invoicing/invoicing.service.spec.ts`.

**Acceptance Scenarios**:

1. **Given** un cobro facturable, **When** lo factura, **Then** recibe su CFDI (folio del SAT) por correo.
2. **Given** datos que el SAT rechaza, **When** factura, **Then** 422 con el motivo del SAT tal cual.
3. **Given** un cobro de otro socio, **When** intenta facturarlo o descargarlo, **Then** no lo encuentra.

### User Story 3 - HQ lista, cuenta y cancela (Priority: P2)

El dueño lista los CFDI del mes, ve el resumen de recibos y cancela con motivo.

**Independent Test**: `invoicing.e2e-spec.ts` (el dueño lista, cuenta, cancela y el cobro vuelve a ser facturable).

**Acceptance Scenarios**:

1. **Given** una factura vigente, **When** el dueño la cancela con motivo 02, **Then** queda cancelada y el cobro vuelve a poder facturarse.

### Edge Cases

- Facturar antes de que el cron dé de alta el recibo: se da de alta en ese momento.
- Webhook con firma inválida: 400.
- Sin llave de Facturapi: `INVOICING_UNAVAILABLE`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada cobro MUST crear su recibo `pending` en la misma transacción, sin llamar al PAC.
- **FR-002**: La cola MUST tomar recibos sin que dos instancias tomen el mismo, con reintentos y estado `failed`.
- **FR-003**: El socio MUST facturar solo sus cobros y una sola vez; los rechazos del SAT MUST devolverse tal cual.
- **FR-004**: El webhook MUST verificar la firma y releer el estado.
- **FR-005**: HQ MUST listar por mes, resumir y cancelar con motivo 02 o 03.

### Key Entities

- FiscalReceipt (estado, clave, URL, intentos), FiscalProfile, Cfdi.

## Success Criteria *(mandatory)*

- **SC-001**: Un PAC caído nunca frena una venta ni un webhook de pago.

## Assumptions

- Sin probar contra Facturapi: falta la cuenta. Por verificar: nombre de la cabecera de firma, eventos al emitir la global, conceptos en línea sin productos dados de alta.

## Fuera de alcance / pendiente conocido

- Cuenta de Facturapi (organización, CSD, domicilio de la matriz, periodicidad de la global, webhook).
- Cancelación con sustitución (motivo 01) y notas de crédito (dependen de la política de devoluciones).
- IEPS y claves SAT reales.
