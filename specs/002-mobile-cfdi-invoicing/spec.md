# Feature Specification: Facturación del socio (CFDI) en la app móvil

**Feature Branch**: `002-mobile-cfdi-invoicing`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "Llevar a mobile-app (iOS/Android) lo que el spec 001 hizo en la web: el socio captura sus datos fiscales, ve sus cobros con su estado de facturación, factura uno, obtiene el PDF/XML y pide corrección por WhatsApp. Reusar el contrato de @mucho-loco/customer-core."

## Clarifications

### Session 2026-09-24

- Q: ¿Cómo obtiene el socio el PDF/XML en el teléfono? → A: Con la hoja de compartir del sistema (guardar en Archivos, mandar por correo o WhatsApp). En la versión web del app, descarga normal.
- Q: ¿Dónde vive la facturación en el app? → A: Pantalla propia `invoicing` (Stack), con acceso desde la pestaña Cuenta — igual que `membership`, `community` y `performance`.
- Q: ¿El formulario fiscal es la misma experiencia que en la web? → A: Sí: mismas reglas (forma, normalización, uso de CFDI filtrado por régimen), mismos textos, con controles nativos (selector de chips en vez de `<select>`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capturar y editar sus datos fiscales (Priority: P1)

Desde Cuenta, el socio abre "Facturar", captura RFC, nombre o razón social, régimen, código postal, uso de CFDI y un correo opcional, y puede editarlos después.

**Why this priority**: sin datos fiscales no se factura nada; se prueba sola.

**Independent Test**: guardar datos válidos, cerrar la pantalla y volver: aparecen igual. RFC o CP con forma inválida → error junto al campo, no se guarda.

**Acceptance Scenarios**:

1. **Given** un socio sin datos fiscales, **When** abre Facturar, **Then** ve la invitación a capturarlos, sin error.
2. **Given** el formulario, **When** escribe RFC o nombre en minúsculas o con espacios, **Then** se guardan en mayúsculas sin espacios sobrantes.
3. **Given** RFC `abcd` o CP `123`, **When** guarda, **Then** ve el error junto al campo y nada se guarda.
4. **Given** régimen 605, **When** ve los usos de CFDI, **Then** solo aparece S01; si tenía G01 elegido, queda sin elegir.

---

### User Story 2 - Pedir la factura de un cobro (Priority: P1) 🎯 MVP

El socio ve sus cobros con su estado, toca "Facturar" en uno facturable, confirma el resumen y la factura se emite.

**Why this priority**: es el valor de la funcionalidad.

**Independent Test**: con datos fiscales guardados, facturar un cobro facturable → pasa a "Facturado" sin salir de la pantalla y con el aviso del correo de destino; no se puede facturar dos veces.

**Acceptance Scenarios**:

1. **Given** datos fiscales y un cobro Facturable, **When** confirma, **Then** el cobro pasa a Facturado y se le indica a qué correo llegan PDF y XML.
2. **Given** un cobro Facturado, Ya no facturable o No facturable, **When** ve la lista, **Then** no se le ofrece facturar y ve la explicación del estado.
3. **Given** que no tiene datos fiscales, **When** toca Facturar, **Then** se le piden y al guardarlos vuelve a la confirmación de ese cobro.
4. **Given** un socio sin cobros, **When** abre Facturar, **Then** ve un estado vacío que lo explica.

---

### User Story 3 - Obtener sus facturas y pedir corrección (Priority: P2)

En un cobro facturado, el socio abre el PDF o el XML con la hoja de compartir del teléfono, y si los datos salieron mal, "¿Datos incorrectos?" abre WhatsApp de soporte con el cobro y el folio.

**Why this priority**: el correo ya entrega los archivos; esto es respaldo y la vía de corrección.

**Independent Test**: en el cobro Facturado de ejemplo, PDF y XML abren el compartir (o descargan en web); el enlace de WhatsApp lleva el folio.

**Acceptance Scenarios**:

1. **Given** un cobro Facturado con factura individual, **When** toca PDF o XML, **Then** se abre el compartir del sistema con ese archivo (descarga en la versión web).
2. **Given** un cobro en la factura global o sin recibo, **When** ve la lista, **Then** no hay archivos ni enlace de corrección.
3. **Given** un cobro Facturado, **When** toca "¿Datos incorrectos?", **Then** se abre WhatsApp con descripción, fecha y folio escritos.

---

### User Story 4 - Entender por qué el SAT rechazó sus datos (Priority: P2)

Si el SAT rechaza los datos, el socio ve el motivo tal cual, el cobro sigue facturable, y un botón lo lleva a corregir y reintentar ese mismo cobro.

**Why this priority**: es el error más probable en CFDI 4.0.

**Independent Test**: con el RFC de rechazo del mock, facturar → motivo visible, cobro sigue Facturable; corregir → reintentar → Facturado.

**Acceptance Scenarios**:

1. **Given** datos que el SAT rechaza, **When** factura, **Then** ve el motivo tal cual y "CORREGIR MIS DATOS".
2. **Given** que corrigió, **When** reintenta ese cobro, **Then** se emite.

---

### Edge Cases

- El cobro cambió de estado por fuera (portal de autofactura, factura global): el mensaje dice cuál y la lista se recarga.
- Facturación no disponible o PAC caído: mensaje de "intenta más tarde"; el cobro sigue Facturable.
- Sin conexión o error del servidor: error genérico de conexión con reintentar, nunca disfrazado de rechazo del SAT.
- Doble toque en "Emitir factura": una sola solicitud.
- Sesión expirada (el refresh falla): se cierra la sesión y la pantalla pide iniciar sesión, como el resto del app.
- Cambio de idioma en Cuenta: etiquetas, fechas y montos cambian; datos fiscales, descripción del cobro y motivo del SAT se muestran tal cual.
- Sin sesión: la pantalla pide iniciar sesión en vez de mostrar datos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El socio MUST poder capturar, ver y editar sus datos fiscales (RFC, nombre o razón social, régimen, CP, uso de CFDI, correo opcional).
- **FR-002**: El régimen MUST elegirse de los 19 vigentes para receptor y el uso de CFDI solo entre los que el catálogo del SAT admite para ese régimen; cambiar de régimen limpia un uso que deja de aplicar.
- **FR-003**: La forma MUST validarse antes de guardar (misma regla que la web y el backend) y RFC/nombre MUST normalizarse a mayúsculas sin espacios sobrantes.
- **FR-004**: El socio MUST ver sus cobros más recientes (hasta 100), del más nuevo al más viejo, con fecha, descripción, total con centavos y uno de 4 estados con su explicación.
- **FR-005**: Solo los cobros Facturable MUST ofrecer facturar, previa confirmación con el resumen del cobro y de los datos fiscales, y la advertencia de que no se corrige desde el app.
- **FR-006**: Sin datos fiscales, facturar MUST llevar a capturarlos y regresar a la confirmación del mismo cobro.
- **FR-007**: Al emitirse, el cobro MUST verse Facturado sin salir de la pantalla y MUST indicarse el correo de destino (el de facturación o, si no hay, el de la cuenta).
- **FR-008**: La acción de emitir MUST quedar deshabilitada mientras la solicitud está en curso.
- **FR-009**: Cada rechazo MUST mostrarse con su mensaje propio (mismos textos que la web); el rechazo del SAT con su motivo tal cual y acceso a corregir datos; tras un rechazo por cambio de estado la lista MUST recargarse.
- **FR-010**: Un cobro Facturado con factura individual MUST ofrecer PDF y XML (compartir del sistema en iOS/Android, descarga en web) y "¿Datos incorrectos?" hacia WhatsApp de soporte con descripción, fecha y folio.
- **FR-011**: La pantalla MUST estar en español e inglés según el idioma del app.
- **FR-012**: La pantalla MUST requerir sesión y MUST ser accesible desde Cuenta.
- **FR-013**: Todo MUST funcionar con datos de prueba (mock) sin backend, igual que contra el backend real.

### Key Entities

Las mismas que el spec 001 (datos fiscales, cobro, factura); ver `specs/001-member-cfdi-invoicing/data-model.md`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con datos fiscales guardados, facturar un cobro toma menos de 1 minuto y como mucho 3 toques desde que se abre Facturar.
- **SC-002**: El 100% de los rechazos se muestra con un mensaje específico.
- **SC-003**: Ningún cobro se factura dos veces por toques repetidos.
- **SC-004**: El recorrido completo (capturar → facturar → rechazo del SAT → corregir → archivos → WhatsApp) pasa en el walkthrough automatizado en modo mock.

## Assumptions

- Contrato, mock, datasource HTTP, errores y catálogo SAT ya existen en `@mucho-loco/customer-core` (spec 001); este spec no los cambia salvo huecos que descubra el plan.
- Número de WhatsApp de soporte: el mismo del negocio. Hoy vive en `apps/customer-app/lib/contact.ts`; si el móvil lo necesita, se mueve a customer-core.
- Sin Xcode ni Android SDK en esta máquina: la validación de UI es el walkthrough en Expo web (como el resto del app). La hoja de compartir nativa solo se prueba en un teléfono real.
- Sin cuenta de Facturapi: contra el backend real la emisión responde "no disponible", lo cual es esperado.
