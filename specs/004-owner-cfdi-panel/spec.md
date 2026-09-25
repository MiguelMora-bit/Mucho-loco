# Feature Specification: Facturas (CFDI) en el panel del dueño

**Feature Branch**: `004-owner-cfdi-panel`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "owner-panel: ver los CFDI emitidos (individuales y globales), buscar por folio, descargar PDF/XML, cancelar con motivo del SAT, ver el resumen de recibos (sobre todo los fallidos) y exportar el mes para el contador."

## Clarifications

### Session 2026-09-24

- Q: ¿Qué formato de exportación para el contador? → A: CSV del mes (una fila por CFDI: folio, tipo, fecha, RFC, nombre, total, estado, estado de cancelación), abrible en Excel. Los XML se descargan uno por uno; un ZIP masivo queda fuera de alcance.
- Q: ¿Qué motivos de cancelación se ofrecen? → A: Los que el backend soporta hoy: 02 (comprobante con errores sin relación) y 03 (no se llevó a cabo la operación). 01 y 04 fuera de alcance.
- Q: ¿Cómo encuentra HQ la factura que un socio reporta por WhatsApp? → A: Búsqueda por folio fiscal, RFC o nombre sobre la lista del mes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver y buscar los CFDI del mes (Priority: P1) 🎯 MVP

El dueño abre "Facturas", elige un mes y ve los CFDI emitidos (individuales y globales) con folio, fecha, RFC, nombre, total y estado; puede buscar por folio, RFC o nombre y descargar PDF/XML.

**Independent Test**: con datos de prueba, elegir el mes, buscar un folio y descargar su PDF.

**Acceptance Scenarios**:

1. **Given** CFDI emitidos en el mes, **When** abre Facturas, **Then** los ve del más reciente al más antiguo, con tipo (individual/global) y estado.
2. **Given** un folio que reportó un socio, **When** lo escribe en la búsqueda, **Then** la lista se reduce a esa factura.
3. **Given** una factura, **When** toca PDF o XML, **Then** se descarga el archivo.
4. **Given** un mes sin facturas, **When** lo elige, **Then** ve un estado vacío.

---

### User Story 2 - Cancelar una factura (Priority: P1)

El dueño cancela una factura vigente eligiendo el motivo del SAT (02 o 03), confirma, y la factura queda cancelada (o "cancelación en proceso" si el SAT la tiene pendiente); el cobro vuelve a poder facturarse.

**Independent Test**: cancelar una factura de prueba con motivo 02 → su estado cambia sin recargar.

**Acceptance Scenarios**:

1. **Given** una factura vigente, **When** elige motivo y confirma, **Then** su estado cambia a cancelada o "en proceso".
2. **Given** una factura ya cancelada, **When** la ve, **Then** no se ofrece cancelar.
3. **Given** que el SAT rechaza la cancelación, **When** confirma, **Then** ve el motivo del rechazo tal cual.
4. **Given** que la facturación no está disponible, **When** intenta cancelar, **Then** ve un mensaje claro y nada cambia.

---

### User Story 3 - Resumen de recibos y exportación para el contador (Priority: P2)

El dueño ve cuántos recibos hay en cada estado (pendientes, abiertos, facturados al cliente, en la global, cancelados, fallidos), con los fallidos resaltados, y exporta el mes a CSV.

**Acceptance Scenarios**:

1. **Given** recibos fallidos, **When** abre Facturas, **Then** el conteo de fallidos se resalta como algo a revisar.
2. **Given** un mes elegido, **When** toca Exportar, **Then** se descarga un CSV con una fila por CFDI del mes y columnas en español.

---

### Edge Cases

- Más de 200 facturas en un mes: el filtro por mes trae todas las del mes (no se corta en 200).
- Meses en hora de Ciudad de México: una factura del 31 a las 23:00 local pertenece a ese mes.
- Nombres con comas o comillas en el CSV: se escapan correctamente; el archivo abre bien en Excel (UTF-8 con BOM).
- Idioma es/en para etiquetas; datos fiscales tal cual.
- Error de conexión: mensaje genérico con reintentar; no se disfraza de rechazo del SAT.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El dueño MUST poder elegir un mes y ver todos los CFDI emitidos en él (hora de Ciudad de México), del más reciente al más antiguo, con folio, tipo, fecha, RFC, nombre, total y estado.
- **FR-002**: El dueño MUST poder buscar por folio, RFC o nombre dentro del mes.
- **FR-003**: Cada CFDI MUST ofrecer descargar PDF y XML.
- **FR-004**: Un CFDI vigente MUST ofrecer cancelar con motivo 02 o 03, previa confirmación que explique el motivo; uno cancelado no.
- **FR-005**: Tras cancelar, el estado MUST actualizarse sin recargar; un rechazo del SAT MUST mostrarse con su motivo.
- **FR-006**: El panel MUST mostrar el resumen de recibos por estado, resaltando los fallidos.
- **FR-007**: El dueño MUST poder exportar el mes a CSV (UTF-8 con BOM, separador coma, campos escapados).
- **FR-008**: Solo el dueño MUST poder ver y operar esta sección.
- **FR-009**: Textos es/en; montos con centavos; fechas en hora local.
- **FR-010**: Todo MUST funcionar con datos de prueba (mock) igual que contra el backend.

### Key Entities

- **CFDI**: factura timbrada (individual de un socio o global del periodo), con folio, receptor, total, estado y estado de cancelación.
- **Resumen de recibos**: conteo de recibos fiscales por estado.

## Success Criteria *(mandatory)*

- **SC-001**: HQ encuentra la factura de un folio reportado en menos de 30 segundos.
- **SC-002**: La exportación de un mes contiene el 100% de sus CFDI.
- **SC-003**: Toda cancelación termina en un estado visible (cancelada, en proceso o rechazada con motivo).

## Assumptions

- Backend existente (`/invoicing/cfdis`, `/summary`, descarga, cancelación); este spec solo agrega el filtro `?month=` para no cortar en 200.
- Sin cuenta de Facturapi, contra el backend real la cancelación y descargas responden "no disponible"; el mock las simula.
- owner-panel requiere Cognito real para iniciar sesión: la validación de UI en navegador necesita User Pool vivo.
