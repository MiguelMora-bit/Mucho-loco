# Feature Specification: Registro de cobros

**Feature Branch**: `045-charges-ledger` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo del registro único de cobros del backend (2026-09-14): cada peso que entra, venga del canal que venga, antes de poder facturar.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- El dinero vivía en cuatro tablas con formas distintas y los cobros de suscripción del mes 2 en adelante no quedaban en ninguna: ahora cada cobro confirmado es un `Charge` con sus `ChargeLine`.
- Un solo escritor (`ChargesService`), llamado DENTRO de la transacción que confirma el cobro de cada canal: no hay pedido pagado sin su cobro ni cobro de una venta revertida.
- Exactamente un origen por cobro (pedido, venta de mostrador, pago de membresía de mostrador, compra de visita o factura de Stripe), con un CHECK escrito a mano; los FKs de origen son `Restrict`.
- Idempotente sin abortar la transacción: `createMany({ skipDuplicates: true })`.
- Suscripciones solo por `invoice.paid` (el primer cobro incluido), para no contarlo dos veces; una factura en $0 no se registra; una pagada fuera de Stripe la registra mostrador (spec 019).
- Centavos en el registro; renglones con el dato fiscal congelado (categoría, clave SAT, IVA); si no suman el total, truena al registrar.
- Forma de pago guardada como hecho (`cash`, `card_credit`, `card_debit`, `oxxo`, `spei`, …), no como clave del SAT (esa traducción es de la facturación).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cada cobro queda registrado una vez (Priority: P1)

Pedidos en línea y en efectivo, ventas y membresías de mostrador, visitas y cada cobro de suscripción dejan un cobro con renglones.

**Independent Test**: `apps/backend/src/charges/charges.service.spec.ts` y el spec de cada canal; `apps/backend/test/*.e2e-spec.ts` (cada canal deja su cobro; los webhooks reentregados no duplican).

**Acceptance Scenarios**:

1. **Given** un webhook de pago reentregado, **When** llega otra vez, **Then** no se crea un segundo cobro.
2. **Given** una renovación de suscripción del mes 3, **When** Stripe manda `invoice.paid`, **Then** queda su cobro con fecha de pago de Stripe.
3. **Given** renglones que no suman el total, **When** se registra, **Then** falla antes de guardar.

### User Story 2 - Los reportes leen el registro (Priority: P2)

Los ingresos de sucursal y de la cadena salen del registro, no de las tablas de cada canal.

**Independent Test**: `branch-ops.e2e-spec.ts` ("reports": el reporte suma exactamente lo del registro de la sucursal).

**Acceptance Scenarios**:

1. **Given** una membresía contratada en línea, **When** el gerente ve su reporte, **Then** aparece en los ingresos de su sucursal.

### Edge Cases

- Envío a domicilio: renglón propio (`shipping`) calculado como total − productos.
- Pedido anterior a los precios congelados: un renglón `unclassified` por el total.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada canal MUST registrar su cobro dentro de la transacción que lo confirma.
- **FR-002**: Un cobro MUST tener exactamente un origen (garantizado en la base).
- **FR-003**: El registro MUST ser idempotente ante reentregas.
- **FR-004**: Los renglones MUST sumar el total y congelar su dato fiscal.
- **FR-005**: Los reportes MUST leer del registro.

### Key Entities

- Charge (`totalCents`, `method`, `paidAt`, `branchId?`, origen único), ChargeLine (`taxCategory`, `satProductKey`, `satUnitKey`, `taxRateBp`), TaxCategory.

## Success Criteria *(mandatory)*

- **SC-001**: Todo cobro confirmado tiene exactamente una fila en el registro.

## Assumptions

- Las claves SAT son provisionales (`01010101`) hasta que el contador defina las reales.

## Fuera de alcance / pendiente conocido

- Claves SAT reales e IEPS de las bebidas energizantes (con el contador).
- Reembolsos (política sin decidir).
