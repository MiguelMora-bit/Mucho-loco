# Feature Specification: Facturación del socio (CFDI) en la web

**Feature Branch**: `001-member-cfdi-invoicing`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Socio factura sus cobros desde el panel de customer-app: captura/edita sus datos fiscales (RFC, razón social, régimen fiscal, código postal, uso de CFDI), ve la lista de sus cobros con su estado de facturación, pide la factura (CFDI) de un cobro y descarga el PDF/XML. Solo customer-app; el backend ya existe (POST /users/me/charges/:id/invoice y endpoints relacionados en el módulo invoicing)."

## Clarifications

### Session 2026-09-23

- Q: ¿Dónde debe vivir la sección de facturación dentro del panel del socio en la web? → A: Página propia (`/invoicing` dentro del área de cuenta), con enlace desde el dashboard.
- Q: Si a un socio se le emite una factura con datos equivocados, ¿qué le ofrece la app para corregirla? → A: En cada cobro facturado, un enlace "¿Datos incorrectos?" que abre WhatsApp de soporte con el cobro y el folio ya escritos; HQ cancela y el socio vuelve a facturar.
- Q: ¿El formulario debe limitar el uso de CFDI según el régimen fiscal elegido? → A: Sí, filtrar en el formulario según el catálogo del SAT: solo se ofrecen los usos válidos para el régimen elegido, y si el uso ya elegido deja de aplicar, se limpia.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pedir la factura de un cobro (Priority: P1)

Un socio con sesión iniciada entra a su panel, ve la lista de lo que le han cobrado (pedidos de
la tienda, membresías y renovaciones, compras de mostrador ligadas a su cuenta) y, en un cobro
que todavía se puede facturar, pide su factura. Si ya tiene datos fiscales guardados, confirma
con qué datos se va a emitir y la factura se emite; el socio ve el cobro como "Facturado" y
recibe el PDF y el XML en su correo.

**Why this priority**: es el valor completo de la funcionalidad. Hoy un socio que necesita
deducir su membresía o su suplementación no tiene cómo facturar desde la app, y lo que no
factura termina en la factura global, donde ya no puede recuperarlo.

**Independent Test**: con un socio que ya tiene datos fiscales y al menos un cobro facturable,
pedir la factura desde el panel y verificar que el cobro cambia a "Facturado" sin recargar
la página y que no se puede facturar dos veces.

**Acceptance Scenarios**:

1. **Given** un socio con datos fiscales guardados y un cobro en estado "Facturable",
   **When** pide la factura y confirma los datos, **Then** el cobro pasa a "Facturado" y se le
   indica que el PDF y el XML llegan a su correo de facturación.
2. **Given** un cobro ya "Facturado", **When** el socio ve la lista, **Then** no se le ofrece
   facturarlo otra vez.
3. **Given** un cobro que ya entró a la factura global del periodo, **When** el socio ve la
   lista, **Then** el cobro aparece como "Ya no facturable" con una explicación de por qué.
4. **Given** un socio sin cobros, **When** abre la sección de facturación, **Then** ve un
   estado vacío que explica que ahí aparecerán sus compras y pagos.

---

### User Story 2 - Capturar y editar sus datos fiscales (Priority: P1)

El socio captura los datos de su Constancia de Situación Fiscal: RFC, nombre o razón social,
régimen fiscal, código postal del domicilio fiscal, uso del CFDI y, opcionalmente, un correo
distinto al de su cuenta para recibir las facturas. Puede volver a editarlos cuando quiera.
Si intenta facturar sin haberlos guardado, se le piden en ese momento y, al guardarlos,
continúa con la factura que estaba pidiendo.

**Why this priority**: sin datos fiscales no se puede emitir ninguna factura; es requisito de
la historia 1. Se separa porque se puede probar sola (guardar, releer, corregir).

**Independent Test**: guardar datos fiscales válidos, salir y volver: los datos aparecen
tal como se guardaron. Intentar guardar un RFC o código postal con forma inválida muestra el
error en el campo y no guarda.

**Acceptance Scenarios**:

1. **Given** un socio sin datos fiscales, **When** abre la sección, **Then** se le invita a
   capturarlos, sin mostrar un error.
2. **Given** el formulario, **When** el socio escribe el RFC o el nombre en minúsculas o con
   espacios sobrantes, **Then** se guardan en mayúsculas y sin espacios sobrantes, igual que en
   la constancia.
3. **Given** un RFC sin forma de RFC o un código postal que no tiene 5 dígitos, **When** el
   socio intenta guardar, **Then** ve un mensaje junto al campo y nada se guarda.
4. **Given** el régimen 605 (sueldos y salarios), **When** el socio abre la lista de usos de
   CFDI, **Then** solo aparece "Sin efectos fiscales" (S01); si antes tenía G01 elegido, queda
   sin elegir.
5. **Given** un socio sin datos fiscales que pide facturar un cobro, **When** captura y guarda
   sus datos, **Then** vuelve a la confirmación de ese mismo cobro sin tener que buscarlo de
   nuevo.
6. **Given** datos fiscales guardados, **When** el socio los edita, **Then** las facturas
   nuevas usan los datos nuevos y las ya emitidas no cambian.

---

### User Story 3 - Descargar sus facturas y pedir corrección (Priority: P2)

Por cada cobro facturado individualmente (desde la app o desde el portal de autofactura con el
ticket de mostrador), el socio puede descargar el PDF y el XML desde su panel, sin depender del
correo.

**Why this priority**: el correo ya entrega los archivos; la descarga es una comodidad y un
respaldo cuando el correo se pierde.

**Independent Test**: con un cobro ya facturado, descargar el PDF y el XML desde la lista y
verificar que corresponden a esa factura.

**Acceptance Scenarios**:

1. **Given** un cobro "Facturado" con factura individual, **When** el socio pide el PDF o el
   XML, **Then** se descarga el archivo de esa factura.
2. **Given** un cobro que entró a la factura global, **When** el socio ve la lista, **Then** no
   se le ofrece descargar nada de ese cobro (la global no es suya).
3. **Given** un cobro "Facturado" con datos equivocados, **When** el socio toca
   "¿Datos incorrectos?", **Then** se abre WhatsApp de soporte con el cobro y el folio ya
   escritos en el mensaje.

---

### User Story 4 - Entender por qué el SAT rechazó sus datos (Priority: P2)

Si al emitir la factura el SAT rechaza los datos (el nombre, régimen o código postal no
coinciden con la constancia, el uso de CFDI no aplica a ese régimen, el RFC no existe), el
socio ve el motivo tal cual y un acceso directo para corregir sus datos y volver a intentarlo.

**Why this priority**: es el error más probable en la vida real (CFDI 4.0 exige coincidencia
exacta con la constancia) y, si no se explica, el socio se queda atorado sin factura.

**Independent Test**: simular un rechazo del SAT al facturar y verificar que se muestra el
motivo, que el cobro sigue "Facturable" y que desde el mensaje se llega a editar los datos.

**Acceptance Scenarios**:

1. **Given** datos que el SAT rechaza, **When** el socio pide la factura, **Then** ve el motivo
   del rechazo, el cobro sigue "Facturable" y puede ir a corregir sus datos.
2. **Given** que corrigió sus datos, **When** vuelve a pedir la factura de ese cobro,
   **Then** la factura se emite normalmente.

---

### Edge Cases

- El socio pide la factura de un cobro que, mientras tanto, ya se facturó desde el portal de
  autofactura o entró a la factura global: se le explica cuál de los dos pasó y la lista se
  actualiza con el estado real.
- El servicio de facturación no está disponible en ese momento: el socio ve un mensaje de
  "intenta más tarde", el cobro sigue "Facturable" y nada se pierde.
- Un fallo que no es de negocio (sin conexión, error del servidor): se muestra como error
  genérico de conexión, nunca disfrazado de rechazo del SAT.
- Doble clic o doble envío al pedir la factura: se emite una sola factura.
- Un cobro anterior a que existiera la facturación, o cuyo recibo se canceló: aparece como
  "No facturable" sin botón de facturar.
- El socio cambia de idioma (es/en): etiquetas, estados, fechas y montos cambian de formato;
  los datos fiscales y el motivo del SAT se muestran tal cual.
- Montos con centavos: se muestran con centavos y en pesos mexicanos.
- La descripción de cada cobro es el concepto fiscal registrado al cobrar (siempre en español,
  como va en el CFDI) y se muestra tal cual en ambos idiomas. Cuando el cobro tiene varios
  renglones, el "… y N más" también llega en español — limitación conocida del contrato actual.
- La sesión expira a mitad del flujo: se le pide volver a iniciar sesión, como en el resto del
  panel.

## Requirements *(mandatory)*

### Functional Requirements

**Datos fiscales**

- **FR-001**: El socio MUST poder capturar, ver y editar sus datos fiscales: RFC, nombre o razón
  social, régimen fiscal, código postal, uso de CFDI y correo de facturación opcional.
- **FR-002**: El régimen fiscal MUST elegirse de la lista de regímenes vigentes para el receptor
  de un CFDI 4.0, mostrando clave y nombre; el uso de CFDI MUST elegirse entre "Adquisición
  de mercancías" (G01), "Gastos en general" (G03) y "Sin efectos fiscales" (S01), ofreciendo
  solo los que el catálogo del SAT admite para el régimen elegido (por ejemplo, 605 "Sueldos y
  salarios" y 616 "Sin obligaciones fiscales" solo admiten S01). Si el socio cambia de régimen y
  el uso elegido deja de aplicar, el uso MUST limpiarse para que lo vuelva a elegir.
- **FR-003**: El sistema MUST validar la forma antes de guardar: RFC de 12 o 13 caracteres con
  forma de RFC, código postal de 5 dígitos, correo con forma de correo si se captura; y MUST
  normalizar RFC y nombre a mayúsculas sin espacios sobrantes.
- **FR-004**: El formulario MUST explicar que el nombre debe ir exactamente como en la
  Constancia de Situación Fiscal y sin el régimen societario (por ejemplo, sin "SA DE CV").
- **FR-005**: Si el correo de facturación se deja vacío, las facturas MUST llegar al correo de la
  cuenta, y el formulario MUST decirlo.

**Lista de cobros**

- **FR-006**: El socio MUST ver sus cobros más recientes (hasta 100), del más reciente al más
  antiguo, con fecha, descripción, total y estado de facturación.
- **FR-007**: Cada cobro MUST mostrar uno de cuatro estados, cada uno con una explicación
  corta: "Facturable", "Facturado", "Ya no facturable" (entró a la factura global) y
  "No facturable".
- **FR-008**: El socio MUST ver únicamente sus propios cobros y facturas.

**Emitir factura**

- **FR-009**: Solo los cobros "Facturable" MUST ofrecer la acción de facturar.
- **FR-010**: Antes de emitir, el sistema MUST mostrar un resumen con el cobro y los datos
  fiscales que se usarán, y advertir que una factura emitida no se puede corregir desde la app.
- **FR-011**: Si el socio no tiene datos fiscales, pedir la factura MUST llevarlo a capturarlos
  y después regresarlo a la confirmación del mismo cobro.
- **FR-012**: Al emitirse la factura, el cobro MUST aparecer como "Facturado" sin que el socio
  tenga que recargar la página, y MUST indicarse a qué correo llegan el PDF y el XML.
- **FR-013**: La acción de facturar MUST quedar deshabilitada mientras la solicitud está en
  curso, para que un doble clic no la envíe dos veces.
- **FR-014**: Cada rechazo del sistema de facturación MUST mostrarse con un mensaje propio y
  accionable: datos rechazados por el SAT (con el motivo tal cual y acceso a editar datos),
  cobro ya facturado, cobro ya en la factura global, cobro no facturable, faltan datos
  fiscales y servicio no disponible por ahora. Después de un rechazo por cambio de estado, la
  lista MUST reflejar el estado real del cobro.

**Descargas y corrección**

- **FR-015**: Cada cobro "Facturado" con factura individual MUST ofrecer descargar el PDF y el
  XML de esa factura.
- **FR-020**: Cada cobro "Facturado" con factura individual MUST ofrecer un enlace
  "¿Datos incorrectos?" que abre una conversación de WhatsApp con soporte, con el mensaje ya
  escrito con la descripción y fecha del cobro y el folio de la factura. La app no cancela
  facturas; lo hace HQ, y después el cobro vuelve a aparecer como "Facturable".

**General**

- **FR-016**: Toda la sección MUST estar disponible en español e inglés, con fechas y montos
  formateados según el idioma elegido. Se muestran tal cual, sin traducir: los datos fiscales,
  el motivo del SAT y la descripción del cobro.
- **FR-017**: La sección MUST requerir sesión iniciada, igual que el resto del panel del socio.
- **FR-018**: La funcionalidad completa MUST poder usarse con datos de prueba sin backend, con
  el mismo comportamiento visible que contra el backend real, incluidos los rechazos.
- **FR-019**: La facturación MUST vivir en una página propia del área de cuenta, con dirección
  propia que se pueda compartir o abrir directo (por ejemplo desde un mensaje), y el dashboard
  MUST tener un acceso visible a ella.

### Key Entities

- **Datos fiscales del socio**: lo que dice su Constancia de Situación Fiscal (RFC, nombre o
  razón social, régimen, código postal) más el uso de CFDI y el correo de facturación. Uno por
  socio; se puede editar; no cambia facturas ya emitidas.
- **Cobro**: cada pago confirmado del socio, venga de la tienda, de la membresía o de mostrador.
  Tiene fecha, descripción, total con IVA incluido y un estado de facturación.
- **Factura (CFDI)**: el comprobante fiscal emitido para un cobro. Tiene PDF y XML descargables.
  Solo las facturas individuales del socio son suyas; la factura global no.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un socio que ya tiene sus datos fiscales obtiene la factura de un cobro en menos
  de 1 minuto y con no más de 3 interacciones desde que abre la sección.
- **SC-002**: Un socio sin datos fiscales los captura y obtiene su primera factura en menos de
  5 minutos, con su constancia a la mano.
- **SC-003**: El 100% de los rechazos del sistema de facturación se muestran con un mensaje
  específico; ninguno aparece como un error genérico.
- **SC-004**: Ningún cobro se factura dos veces por acciones repetidas del socio (doble clic,
  reintento, dos pestañas).
- **SC-005**: Cambiar entre datos de prueba y el backend real no cambia nada de lo que el socio
  ve en pantalla para los mismos datos.
- **SC-006**: Un socio al que el SAT le rechaza los datos puede corregirlos y facturar el mismo
  cobro sin salir de la sección y sin ayuda de soporte.

## Assumptions

- **Solo la web del socio.** La app móvil, el ticket de mostrador (clave de autofactura) y la
  consulta de facturas del dueño son specs aparte.
- **El backend ya cumple el contrato**: datos fiscales, lista de cobros con estado, emisión y
  descarga ya existen y tienen pruebas; esta funcionalidad no cambia las reglas del backend.
  Si el diseño descubre un hueco en el contrato, se documenta y se decide en el plan.
- **No se prueba contra el proveedor de facturación real**: todavía no existe la cuenta, así que
  se verifica con datos de prueba y con el backend usando un proveedor simulado.
- **Plazo para facturar**: lo decide el contador (pendiente en el CLAUDE.md raíz). La app no
  muestra un plazo; solo refleja cuando un cobro ya entró a la factura global.
- **Corregir una factura mal emitida** no se hace desde la app: el socio escribe a soporte por
  WhatsApp (FR-020), HQ la cancela y el cobro vuelve a ser facturable. El número de soporte es
  el mismo que ya usa el sitio para contacto.
- **El SAT valida el fondo** (que el RFC exista y coincida con nombre, régimen y código postal);
  la app solo valida la forma y muestra el rechazo del SAT tal cual.
- **Validación régimen ↔ uso de CFDI**: el formulario filtra según el catálogo del SAT (FR-002).
  Si el catálogo cambia y la tabla queda vieja, el SAT sigue siendo la última palabra: su
  rechazo se muestra con motivo (historia 4).
- **Cantidad de cobros**: se muestran los 100 más recientes (tope del backend). Paginación fuera
  de alcance; los cobros más viejos de un socio antiguo ya entraron a facturas globales cerradas.
- **Un emisor para las 15 sucursales**: la sucursal donde se hizo el cobro no cambia quién
  factura ni se le pide al socio.
