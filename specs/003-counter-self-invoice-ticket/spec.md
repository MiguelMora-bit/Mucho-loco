# Feature Specification: Clave de autofactura en el ticket de mostrador

**Feature Branch**: `003-counter-self-invoice-ticket`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "branch-app: el ticket de una venta de mostrador o de un pago de membresía en mostrador lleva la clave y el QR de autofactura (portal de Facturapi), para que el cliente sin app se facture solo. El recibo fiscal se crea en segundo plano, así que el ticket tiene que pedirlo."

## Clarifications

### Session 2026-09-24

- Q: ¿Qué ve el staff si la clave todavía no está lista al cobrar? → A: El ticket muestra "clave en proceso" y la pantalla la sigue pidiendo sola unos segundos; si no llega, el staff puede volver a abrir el ticket de ese cobro más tarde desde el corte de caja y reimprimirlo.
- Q: ¿Qué cobros llevan ticket con clave? → A: Venta de productos en mostrador, alta de socio y renovación de membresía en mostrador — los tres cobros que nacen en `/counter`. Un pedido "recoger en gym" pagado en efectivo queda fuera de este alcance.
- Q: ¿Cómo se entrega el ticket? → A: En pantalla, con botón "Imprimir" que usa la impresión del navegador con un formato de ticket (80 mm). Sin integración con impresoras térmicas específicas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ticket con clave de autofactura al cobrar (Priority: P1) 🎯 MVP

Al confirmar una venta o un pago de membresía en mostrador, el staff ve el ticket: sucursal, fecha, conceptos, total, forma de pago, y la sección "¿Necesitas factura?" con el QR y la clave del portal de autofactura. Lo imprime y se lo da al cliente.

**Why this priority**: hoy un cliente de mostrador no tiene cómo facturar; todo termina en la factura global.

**Independent Test**: hacer una venta en mostrador → el ticket muestra total y, en segundos, la clave y el QR; "Imprimir" abre el diálogo de impresión con formato de ticket.

**Acceptance Scenarios**:

1. **Given** una venta confirmada, **When** el recibo fiscal ya existe, **Then** el ticket muestra la clave, el QR que abre el portal y hasta cuándo se puede facturar.
2. **Given** una venta confirmada, **When** el recibo todavía no existe, **Then** el ticket dice "clave en proceso" y se actualiza solo cuando llega (sin que el staff haga nada).
3. **Given** un alta o renovación de membresía cobrada, **When** se confirma, **Then** aparece el mismo ticket con su clave.
4. **Given** el ticket en pantalla, **When** el staff toca "Imprimir", **Then** se imprime solo el ticket, en formato angosto.

---

### User Story 2 - Reimprimir el ticket de un cobro del turno (Priority: P2)

Si la clave no llegó a tiempo o el cliente regresa, el staff abre el ticket de un cobro del turno desde el corte de caja y lo reimprime con la clave ya lista.

**Why this priority**: cubre el caso en que el PAC tarda; sin esto la clave se pierde para ese cliente.

**Independent Test**: desde el corte de caja, en una transacción del turno, "Ver ticket" muestra el ticket con su clave.

**Acceptance Scenarios**:

1. **Given** una venta del turno, **When** el staff toca "Ver ticket", **Then** ve el ticket con la clave (o "en proceso" si aún no existe).
2. **Given** un cobro cuyo recibo ya se facturó o entró a la global, **When** se abre su ticket, **Then** la sección de factura explica que ya no se puede autofacturar.

---

### Edge Cases

- El PAC no está disponible o la facturación está apagada: el ticket se imprime igual, con "Factura no disponible por ahora; pídela en sucursal" — nunca bloquea el cobro.
- El recibo falló definitivamente (10 intentos): mismo mensaje que "no disponible"; HQ lo ve en su resumen.
- Idioma: el ticket sigue el idioma de la app de sucursal; los conceptos se muestran como los registró el sistema.
- Montos con centavos y fecha/hora local de la sucursal.
- Sin conexión al pedir la clave: el ticket sigue visible y se reintenta al volver a abrirlo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Al confirmar una venta de productos, un alta o una renovación de membresía en mostrador, el sistema MUST mostrar un ticket con sucursal, fecha y hora, conceptos, total y forma de pago.
- **FR-002**: El ticket MUST incluir, cuando exista, la clave de autofactura, un QR que abre el portal de autofactura de ese cobro y la fecha límite para facturar.
- **FR-003**: Si la clave aún no existe, el ticket MUST indicarlo y actualizarse solo durante al menos 30 segundos sin intervención del staff.
- **FR-004**: Si la facturación no está disponible o el recibo falló, el ticket MUST decirlo con un mensaje claro y seguir siendo imprimible.
- **FR-005**: Si el recibo ya se facturó o entró a la factura global, el ticket MUST indicar que ya no se puede autofacturar y no mostrar clave.
- **FR-006**: "Imprimir" MUST imprimir solo el ticket, con formato de 80 mm.
- **FR-007**: El staff MUST poder abrir y reimprimir el ticket de cualquier cobro del turno desde el corte de caja.
- **FR-008**: Solo staff de la sucursal del cobro MUST poder ver su ticket.
- **FR-009**: Textos en español e inglés; montos con centavos; fecha y hora locales.
- **FR-010**: Todo MUST funcionar con datos de prueba (mock) igual que contra el backend.

### Key Entities

- **Ticket de cobro**: lo que se le entrega al cliente de mostrador: datos del cobro + estado de su autofactura.
- **Estado de autofactura**: pendiente / lista (clave, URL del portal, fecha límite) / ya facturado / no disponible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En condiciones normales, la clave aparece en el ticket en menos de 90 segundos desde el cobro sin acción del staff.
- **SC-002**: El 100% de los cobros de mostrador pueden imprimir ticket, haya o no clave.
- **SC-003**: Un cliente puede facturarse con el QR del ticket sin crear cuenta ni hablar con el staff.

## Assumptions

- El recibo fiscal lo crea el worker del backend en segundo plano (hasta ~1 minuto normalmente); el backend ya guarda `key`, `selfInvoiceUrl` y `expiresAt` por cobro.
- El portal de autofactura es el de Facturapi; no se construye página propia.
- Sin cuenta de Facturapi no hay claves reales: contra el backend real el estado será "pendiente" o "no disponible". El mock simula la clave.
- Branch-app requiere Cognito real para iniciar sesión: la validación de UI con Playwright necesita User Pool vivo (igual que el resto del app).
