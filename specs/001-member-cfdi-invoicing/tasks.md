---

description: "Task list for Facturación del socio (CFDI) en la web"
---

# Tasks: Facturación del socio (CFDI) en la web

**Input**: Design documents from `/specs/001-member-cfdi-invoicing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: SÍ se incluyen. El principio V de la constitución los exige (unit para lógica pura y
datasources, e2e de backend contra Postgres real, Playwright para flujos críticos,
integración de rutas). Escribir cada test antes de su implementación y verlo fallar.

**Organization**: Tasks agrupadas por historia. Orden de fases: US2 antes que US1 — las dos son
P1, pero facturar (US1) necesita datos fiscales guardados, y US2 se prueba sola.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas incompletas)
- **[Story]**: historia del spec (US1–US4)
- Rutas relativas a la raíz del monorepo

## Referencias rápidas (leer antes de empezar)

- Patrón a copiar para el dominio: `packages/customer-core/src/membership-errors.ts`,
  `packages/customer-core/src/mock/payment.mock.ts`, `packages/customer-core/src/http/account.http.ts`,
  `apps/customer-app/lib/repositories/payment.repository.ts`,
  `apps/customer-app/app/api/membership/invoice/route.ts`,
  `apps/customer-app/app/[locale]/(account)/membership/page.tsx`.
- Estado del mock a nivel de módulo en `globalThis` (ver `RECORDS` en
  `packages/customer-core/src/mock/user.mock.ts`, línea ~190): el Server Component y los Route
  Handlers tienen que ver la MISMA instancia.
- Contratos: `specs/001-member-cfdi-invoicing/contracts/*.md`. Formas y estados:
  `specs/001-member-cfdi-invoicing/data-model.md`.
- **Playwright y sesión**: `login()` de `tests/e2e/shop-checkout.spec.ts` inicia sesión contra
  Cognito REAL (`E2E_TEST_EMAIL`, creado por `global-setup.ts`) aunque los datos sean mock. Hoy
  no hay User Pool vivo (CLAUDE.md raíz, "Nota operativa"): los specs de Playwright se escriben
  ahora y se corren cuando haya pool (`terraform apply -target=module.cognito` + `.env.local`,
  con confirmación explícita del dueño del proyecto). La validación manual de UI también
  necesita el pool: customer-app no tiene login mock. No inventar un login falso.
- **Playwright y estado del mock**: el mock vive en memoria del dev server y persiste entre
  corridas (ver `ensureMembership` en `shop-checkout.spec.ts`). Los tests MUST ser idempotentes:
  elegir el cobro por estado en tiempo de ejecución, no por posición, y reescribir los datos
  fiscales que necesiten al empezar. Si se agotan los cobros `available`, reiniciar `pnpm dev`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: cambios aditivos en paquetes compartidos y backend que todo lo demás usa.

- [X] T001 [P] Agregar `uuid: string | null` a `MemberCharge.invoice` en `packages/types/src/index.ts`, con el comentario "Folio fiscal del SAT. Solo con status 'invoiced' (la global no es del socio)." Ajustar cualquier literal de `MemberCharge` que deje de compilar (`pnpm -r typecheck`).
- [X] T002 [P] Escribir tests (fallando) de `put` y `getFile` en `packages/api-client/src/index.test.ts`: `put` manda `PUT` con JSON y token; `getFile` devuelve `{ data: Uint8Array, contentType, filename }` leyendo bytes (probar con bytes no-UTF8, p. ej. `%PDF-1.4\n\xff\xfe`), saca `filename` de `Content-Disposition: attachment; filename="x.pdf"` (`null` si no viene), un 4xx con cuerpo JSON `{ code }` tira `ApiRequestError` con ese `code`, red caída → `status 0`, y respeta el timeout.
- [X] T003 Implementar `put<T>(path, body?, opts?)` y `getFile(path, opts?): Promise<ApiFile>` (+ `export interface ApiFile { data: Uint8Array; contentType: string; filename: string | null }`) en `packages/api-client/src/index.ts`. `put` como `post` con método `PUT` (`body ?? {}`). `getFile`: `Accept: */*`, lee `arrayBuffer()` DENTRO del timeout, no-2xx → decodifica el texto y reusa `parse` para el error, sin `cachePolicy` (siempre `cache: 'no-store'`). Hacer pasar T002. (depende de T002)
- [X] T004 [P] Backend: en `apps/backend/test/invoicing.e2e-spec.ts` agregar asserts (fallando) de que `GET /users/me/charges` trae `invoice.uuid` igual al `uuid` del CFDI cuando el cobro se facturó al socio, y `uuid: null` cuando está `available` o entró a la global (`closed`).
- [X] T005 Backend: en `apps/backend/src/invoicing/invoicing.service.ts` (`getCharges`) cambiar el include a `{ lines: true, fiscalReceipt: { include: { cfdi: true } } }`, y en `apps/backend/src/invoicing/fiscal-mapping.ts` (`toMemberCharge`) llenar `uuid: status === 'invoiced' ? (row.fiscalReceipt?.cfdi?.uuid ?? null) : null` (ajustar el tipo del parámetro). Actualizar el unit de `fiscal-mapping.spec.ts` si construye `MemberCharge`. `pnpm --filter @mucho-loco/backend test && test:e2e` en verde. (depende de T001, T004)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: contrato, errores, catálogo fiscal, mock, datasource HTTP, repositorio y el
esqueleto de la página. **Ninguna historia empieza antes de terminar esta fase.**

### Tests (escribir primero)

- [X] T006 [P] Tests (fallando) del catálogo fiscal en `packages/customer-core/src/fiscal.test.ts`: `allowedCfdiUses` devuelve `['G01','G03','S01']` para 601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626 y solo `['S01']` para 605, 607, 608, 610, 611, 614, 615, 616; `TAX_SYSTEMS` tiene exactamente esas 19 claves; `normalizeFiscalText('  xaxx010101000 ')` → `'XAXX010101000'`; `isRfcShape` acepta 12 y 13 caracteres con `^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$` y rechaza `'ABCD'`; `isZipShape` exige `^\d{5}$`; `validateFiscalProfile` devuelve errores por campo (`taxId`, `legalName` vacío o > 254, `taxSystem` fuera de catálogo, `zip`, `cfdiUse` no permitido para el régimen, `email` con forma inválida) y `{}` para un perfil válido.
- [X] T007 [P] Tests (fallando) de `formatMoney` en `packages/customer-core/src/pricing.test.ts`: `formatMoney(1090, 'es')` y `formatMoney(1090.5, 'en')` siempre con 2 decimales y moneda MXN, sin depender del locale del runtime.
- [X] T008 [P] Agregar `formatDateTime(iso, lang)` en `packages/customer-core/src/dates.ts`, copiado de `apps/branch-app/src/lib/dates.ts:35` (`es-MX`/`en-US`, día, mes corto, hora y minuto) en hora LOCAL — sin `timeZone: 'UTC'`: es un instante, no una fecha sola. Test en `packages/customer-core/src/dates.test.ts`: con `TZ` fijado a `America/Mexico_City`, un ISO UTC muestra la hora local correcta (p. ej. `2026-09-01T03:30:00Z` → 31 de agosto, 21:30).
- [X] T009 [P] Tests (fallando) del mock en `packages/customer-core/src/mock/invoicing.mock.test.ts`, siguiendo "Comportamiento que el mock MUST imitar" de `contracts/invoicing-repository.md`: correo nuevo → `getFiscalProfile` `null` y 5 cobros (2 `available`, 1 `invoiced` con `cfdiId` y `uuid`, 1 `closed`, 1 `unavailable`) ordenados por `paidAt` desc; `saveFiscalProfile` normaliza; cada rechazo de `invoiceCharge` con su código vía `invoicingErrorOf` (`FISCAL_PROFILE_REQUIRED`, `CHARGE_NOT_FOUND`, `CHARGE_ALREADY_INVOICED`, `INVOICING_WINDOW_CLOSED`, `CHARGE_NOT_INVOICEABLE`); RFC `XAXX010101000` → `FISCAL_DATA_REJECTED` con `detail` no vacío y el cobro sigue `available`; éxito → `invoiced` con `uuid` forma v4; facturar dos veces el mismo → la segunda `CHARGE_ALREADY_INVOICED`; `downloadInvoice` de un `cfdiId` ajeno → `CFDI_NOT_FOUND`, propio → bytes con `contentType` `application/pdf` / `application/xml`; cada cobro tiene exactamente las llaves de `MemberCharge` (incluido `invoice.uuid`) y `uuid` distinto de `null` solo cuando `status === 'invoiced'`, igual que el backend (T005).
- [X] T010 [P] Tests (fallando) del datasource HTTP en `packages/customer-core/src/http/http.test.ts` (nuevo `describe('InvoicingHttpDatasource')`, con `stubFetch`/`call` existentes): cada método pega en su ruta y método de la tabla "Mapeo HTTP" de `contracts/invoicing-repository.md`, siempre con token, sin mandar `email`; ids con `encodeURIComponent`; 404 en `GET /users/me/fiscal-profile` → `null`; cada código de error del backend (cuerpo `{ code, detail? }`) se lee con `invoicingErrorOf` con su `detail`; un 500 y `status 0` → `invoicingErrorOf` devuelve `null`.

### Implementación

- [X] T011 [P] Crear `packages/customer-core/src/fiscal.ts` con `TAX_SYSTEMS: { key: string; name: LocalizedString }[]` (las 19 claves de `apps/backend/src/invoicing/dto/fiscal-profile.dto.ts` con su nombre oficial del SAT en es y en), `CFDI_USES` (G01 "Gastos en general", G03 "Adquisición de mercancías", S01 "Sin efectos fiscales", con en), `allowedCfdiUses`, `normalizeFiscalText`, `isRfcShape`, `isZipShape`, `validateFiscalProfile`. Mismas expresiones que el DTO del backend. Verificar la tabla régimen↔uso contra el catálogo `c_UsoCFDI` vigente del SAT y anotar la fecha de verificación en un comentario. Hace pasar T006. (depende de T006)
- [X] T012 [P] Agregar `formatMoney(amount: number, lang: Lang): string` en `packages/customer-core/src/pricing.ts` con `Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })`. No tocar `formatPrice`. Hace pasar T007. (depende de T007)
- [X] T013 [P] Crear `packages/customer-core/src/invoicing-errors.ts` copiando el patrón de `membership-errors.ts`: `InvoicingErrorCode` (los 9 códigos de `contracts/invoicing-repository.md`), `class InvoicingError extends Error { code; detail? }`, `invoicingErrorOf(e): { code; detail? } | null` (acepta `InvoicingError` y `ApiRequestError` con `code` conocido; `detail` de `e.body.detail` si es string).
- [X] T014 Agregar a `packages/customer-core/src/contract.ts` `InvoiceFile` e `IInvoicingRepository` exactamente como en `contracts/invoicing-repository.md`, con los comentarios de cada método. (depende de T001)
- [X] T015 Crear `packages/customer-core/src/mock/invoicing.mock.ts` (`InvoicingMockDatasource implements IInvoicingRepository`) con estado por correo en `globalThis.__mlInvoicingRecords` (mismo motivo que `RECORDS` de `user.mock.ts`), `delay()` como los otros mocks, semilla de 5 cobros con descripciones y montos realistas del catálogo (con centavos en al menos uno), rechazo del SAT para `XAXX010101000` con un motivo estilo SAT (p. ej. "El RFC del receptor no se encuentra en la lista de RFC inscritos no cancelados del SAT."), PDF mínimo válido (`%PDF-1.4 … %%EOF`) y XML de ejemplo con el `uuid`. Exportarlo en `packages/customer-core/src/mock/index.ts`. Hace pasar T009. (depende de T009, T011, T013, T014)
- [X] T016 Crear `packages/customer-core/src/http/invoicing.http.ts` (`InvoicingHttpDatasource`, constructor recibe `ApiClient` como `PaymentHttpDatasource`) usando `getOrNull`, `put`, `get`, `post`, `getFile`; si `getFile` no trae `filename`, usar `factura-<cfdiId>.<format>`. Exportarlo en `packages/customer-core/src/http/index.ts`. Hace pasar T010. (depende de T003, T010, T013, T014)
- [X] T017 Agregar `"./fiscal": "./src/fiscal.ts"` e `"./invoicing-errors": "./src/invoicing-errors.ts"` a `exports` en `packages/customer-core/package.json`. (depende de T011, T013)
- [X] T018 [P] Crear `apps/customer-app/lib/repositories/invoicing.repository.ts` como `payment.repository.ts`: `isHttpDatasourceEnabled() ? new InvoicingHttpDatasource(accountApi) : new InvoicingMockDatasource()`; re-exportar el tipo. Y `apps/customer-app/lib/repositories/invoicing.repository.test.ts` (con el mock): perfil `null` al inicio, 5 cobros, guardar y releer. (depende de T015, T016)
- [X] T019 [P] Agregar `'/invoicing'` a `PROTECTED_PATHS` en `apps/customer-app/lib/auth.ts` y un caso en `apps/customer-app/lib/auth.test.ts` (`isProtected('/invoicing')` y `'/invoicing?charge=x'` → true).
- [X] T020 [P] Agregar el namespace `invoicing` a `packages/customer-core/messages/es.json` y `en.json` con TODAS las cadenas de la funcionalidad: título, subtítulo, acceso desde el dashboard, formulario (etiquetas, ayudas de FR-004 y FR-005, errores por campo, guardar, guardado), lista (vacío de US1-4, columnas, las 4 etiquetas y explicaciones de FR-007), confirmación (resumen, advertencia de FR-010, confirmar, cancelar), éxito (correo de destino de FR-012), un mensaje por código de error de FR-014 (+ conexión genérica), descarga PDF/XML, "¿Datos incorrectos?" y la plantilla del mensaje de WhatsApp con `{description}`, `{date}`, `{uuid}`. Mismas llaves en es y en.
- [X] T021 Crear `apps/customer-app/app/[locale]/(account)/invoicing/page.tsx` (Server Component, patrón de `membership/page.tsx`): `generateMetadata` con `robots: noindex`, `setRequestLocale`, sin sesión → `redirect({ href: '/account', locale })`, lee en paralelo `invoicingRepository.getFiscalProfile(email)`, `invoicingRepository.getCharges(email)` y `userRepository.getProfile(email)` (correo de la cuenta), lee `searchParams.charge` y renderiza `InvoicingClient` (esqueleto por ahora) en `apps/customer-app/components/invoicing/InvoicingClient.tsx` con título, subtítulo y props `{ fiscalProfile, charges, accountEmail, initialChargeId }`. (depende de T018, T020)
- [X] T022 [P] Agregar un acceso a `/invoicing` en `apps/customer-app/components/dashboard/Sidebar.tsx` como el de `/performance` (`Link`, activo cuando `pathname === '/invoicing'`, ícono `LuReceipt` de `react-icons/lu`, etiqueta de `t.dashboard.nav.invoicing` — agregar la llave en es/en). (depende de T020)

**Checkpoint**: `/invoicing` abre con sesión (mock), redirige sin ella, y todo lo de paquetes está probado.

---

## Phase 3: User Story 2 - Capturar y editar sus datos fiscales (Priority: P1)

**Goal**: el socio captura, ve y edita sus datos fiscales con validación de forma, normalización
y uso de CFDI filtrado por régimen.

**Independent Test**: guardar datos válidos, salir y volver → aparecen igual; RFC o CP con forma
inválida → error junto al campo y nada se guarda; régimen 605 → solo S01.

### Tests for User Story 2

- [X] T023 [P] [US2] Playwright (fallando) en `apps/customer-app/tests/e2e/invoicing.spec.ts` (`describe('datos fiscales')`, sesión como en `shop-checkout.spec.ts`, `locale: 'es-MX'`): sin datos → invitación sin error (US2-1); `abcd` / `123` → errores por campo y nada guardado (US2-3); régimen 605 con G01 elegido → uso limpio y solo S01 disponible (US2-4); `  xaxx010101000 ` y nombre en minúsculas → guardados en mayúsculas sin espacios, persisten al recargar (US2-2); editar → los datos nuevos se ven (US2-6).

### Implementation for User Story 2

- [X] T024 [US2] Crear `apps/customer-app/app/api/invoicing/fiscal-profile/route.ts` (`PUT`) según `contracts/route-handlers.md`: 401 sin sesión; `email` vacío → `null`; `validateFiscalProfile` → `400 { error: 'INVALID_FISCAL_PROFILE', fields }`; si no, `invoicingRepository.saveFiscalProfile` y `200` con lo guardado; errores no de negocio se relanzan. (depende de T018)
- [X] T025 [US2] Crear `apps/customer-app/components/invoicing/FiscalProfileForm.tsx` (`'use client'`): campos RFC, nombre o razón social (ayuda FR-004), régimen (select con `TAX_SYSTEMS`, "clave — nombre" en el idioma activo), CP, uso de CFDI (select con `allowedCfdiUses(taxSystem)`; al cambiar régimen, si el uso ya no aplica, se limpia — FR-002), correo opcional (ayuda FR-005 con el correo de la cuenta). Valida con `validateFiscalProfile` antes de mandar y muestra errores por campo (también los `fields` de un 400); `PUT /api/invoicing/fiscal-profile`; botón deshabilitado mientras guarda; `onSaved(profile)`. Textos solo de `t.invoicing`. Si la ruta responde 401 (sesión expirada a mitad del flujo), redirigir con `useRouter` de `@/i18n/routing` a `/account?next=/invoicing` (`NEXT_PARAM` de `lib/auth.ts`), sin mostrar error. (depende de T011, T020, T024)
- [X] T026 [US2] Integrar el formulario en `apps/customer-app/components/invoicing/InvoicingClient.tsx`: sin perfil → invitación + formulario abierto; con perfil → resumen de datos fiscales con botón "Editar" que abre el formulario; tras guardar, el resumen se actualiza sin recargar. Hace pasar T023. (depende de T021, T025)

**Checkpoint**: US2 completa y probada con el mock.

---

## Phase 4: User Story 1 - Pedir la factura de un cobro (Priority: P1) 🎯 MVP

**Goal**: lista de cobros con estado y emisión del CFDI con confirmación, sin recargar y sin
doble envío.

**Independent Test**: con datos fiscales guardados y un cobro Facturable, facturar desde
`/invoicing` → "Facturado" sin recargar, aviso del correo; no se puede facturar dos veces.

### Tests for User Story 1

- [X] T027 [P] [US1] Playwright (fallando) en `apps/customer-app/tests/e2e/invoicing.spec.ts` (`describe('facturar')`): lista con 5 cobros, fecha, descripción, total con centavos y las 4 etiquetas (FR-006/007); "Facturable" → confirmar → "Facturado" sin recargar y aviso con el correo (US1-1, FR-012); el cobro facturado ya no ofrece facturar (US1-2); "Ya no facturable" con explicación (US1-3); sin datos fiscales → "Facturar" abre el formulario y al guardar vuelve a la confirmación de ESE cobro (US2-5, FR-011); doble clic en confirmar → una sola factura (SC-004); `/invoicing` sin sesión → `/account` (FR-017); con la página abierta, borrar la cookie `ml_session` y confirmar una factura → termina en `/account` con `next` (caso límite de sesión expirada).
- [X] T028 [P] [US1] Estado vacío (US1-4): exportar `NO_CHARGES_TEST_EMAIL` desde `packages/customer-core/src/mock/invoicing.mock.ts` (patrón de `ALL_GYMS_TEST_EMAIL` en `user.mock.ts`) cuya semilla no tiene cobros, y cubrirlo en `packages/customer-core/src/mock/invoicing.mock.test.ts`. El usuario de Playwright sí tiene cobros y no hay tests de componentes en este app, así que el vacío queda cubierto por este unit.

### Implementation for User Story 1

- [X] T029 [US1] Crear `apps/customer-app/app/api/invoicing/charges/[chargeId]/invoice/route.ts` (`POST`) según `contracts/route-handlers.md`: 401 sin sesión; `invoicingRepository.invoiceCharge` → `200 { cfdi, charges }` (lista releída); rechazos con `invoicingErrorOf` → status de la tabla, `{ error, detail? }` y `charges` releídos para `CHARGE_NOT_FOUND`, `CHARGE_ALREADY_INVOICED`, `INVOICING_WINDOW_CLOSED`, `CHARGE_NOT_INVOICEABLE`; lo demás se relanza. (depende de T018)
- [X] T030 [P] [US1] Crear `apps/customer-app/components/invoicing/ChargeList.tsx`: cobros en el orden recibido, fecha con `formatDateTime` de `@mucho-loco/customer-core/dates` (T008; instante → hora local), total con `formatMoney(total, lang)`, descripción tal cual, etiqueta + explicación por estado (tabla "Estado de facturación → lo que ve el socio" de `data-model.md`), botón "Facturar" SOLO en `available` (FR-009), estado vacío (US1-4). Slots para acciones de `invoiced` (US3). (depende de T008, T012, T020)
- [X] T031 [US1] Crear `apps/customer-app/components/invoicing/InvoiceConfirm.tsx` (`'use client'`): resumen del cobro y de los datos fiscales, advertencia de FR-010 (no se corrige desde la app), confirmar/cancelar; `POST /api/invoicing/charges/{id}/invoice`; confirmar deshabilitado mientras la solicitud está en curso (FR-013); éxito → `onInvoiced({ cfdi, charges })` y aviso con `fiscalProfile.email ?? accountEmail` (FR-012); rechazo → mensaje de `t.invoicing.errors[code]` y, si trae `charges`, `onChargesChanged(charges)`; error sin código → mensaje genérico de conexión; 401 → redirigir a `/account?next=/invoicing?charge=<id>` (codificado, `NEXT_PARAM` de `lib/auth.ts`) sin mostrar error. `FISCAL_DATA_REJECTED` queda para US4 (por ahora mensaje genérico de su código). (depende de T020, T029)
- [X] T032 [US1] Integrar en `apps/customer-app/components/invoicing/InvoicingClient.tsx`: estado local de `charges`; "Facturar" sin perfil → abre el formulario recordando el `chargeId` y, al guardar, abre `InvoiceConfirm` de ese cobro (FR-011); con perfil → `InvoiceConfirm`; `initialChargeId` (`?charge=`) abre la confirmación de ese cobro si es `available`. Hace pasar T027. (depende de T026, T030, T031)

**Checkpoint**: US1 + US2 = MVP funcionando de punta a punta con el mock.

---

## Phase 5: User Story 3 - Descargar sus facturas y pedir corrección (Priority: P2)

**Goal**: PDF/XML descargables y enlace "¿Datos incorrectos?" a WhatsApp con el folio.

**Independent Test**: en un cobro "Facturado", descargar PDF y XML; el enlace abre `wa.me`
con descripción, fecha y folio.

### Tests for User Story 3

- [X] T033 [P] [US3] Playwright (fallando) en `apps/customer-app/tests/e2e/invoicing.spec.ts` (`describe('descargas y corrección')`): en el cobro `invoiced` de la semilla, PDF y XML disparan `download` con nombre y bytes no vacíos (US3-1); los cobros `closed`/`unavailable` no ofrecen descargas (US3-2); "¿Datos incorrectos?" es un enlace `https://wa.me/<número>?text=…` cuyo texto decodificado contiene descripción, fecha y `uuid` (US3-3, FR-020).

### Implementation for User Story 3

- [X] T034 [US3] Crear `apps/customer-app/app/api/invoicing/invoices/[cfdiId]/[format]/route.ts` (`GET`) según `contracts/route-handlers.md`: 401 sin sesión; `format` fuera de `pdf|xml` → 400; `invoicingRepository.downloadInvoice` → `new Response(data, { headers: { 'Content-Type', 'Content-Disposition': attachment; filename="…", 'Cache-Control': 'private, no-store' } })`; `CFDI_NOT_FOUND` → 404; lo demás se relanza. (depende de T018)
- [X] T035 [P] [US3] Mover `WHATSAPP` de `apps/customer-app/components/landing/Contact.tsx` a `apps/customer-app/lib/contact.ts` (exportado, con su comentario) e importarlo desde `Contact.tsx` sin cambiar su comportamiento. Agregar `whatsappUrl(text: string)` → `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(text)}`.
- [X] T036 [US3] En `apps/customer-app/components/invoicing/ChargeList.tsx`, para `status === 'invoiced'` con `cfdiId`: enlaces `<a href="/api/invoicing/invoices/{cfdiId}/pdf" download>` y `.../xml` (FR-015), y "¿Datos incorrectos?" con `whatsappUrl(t.invoicing.whatsappMessage` llenado con descripción, fecha formateada y `uuid`)`, `target="_blank" rel="noopener noreferrer"` (FR-020). Nada de esto en `closed`/`unavailable`. Hace pasar T033. (depende de T030, T034, T035)

**Checkpoint**: US3 funciona sola sobre el cobro `invoiced` de la semilla del mock.

---

## Phase 6: User Story 4 - Entender por qué el SAT rechazó sus datos (Priority: P2)

**Goal**: el rechazo del SAT se ve con su motivo, el cobro sigue Facturable y hay acceso directo
a corregir datos y reintentar.

**Independent Test**: con RFC `XAXX010101000` (rechazo del mock) facturar → motivo tal cual,
cobro sigue "Facturable", el mensaje lleva a editar datos; con RFC válido se factura.

### Tests for User Story 4

- [X] T037 [P] [US4] Playwright (fallando) en `apps/customer-app/tests/e2e/invoicing.spec.ts` (`describe('rechazo del SAT')`): guardar `XAXX010101000` (régimen 616, S01) → facturar → se ve el `detail` del mock tal cual, el cobro sigue "Facturable" (US4-1); el botón del mensaje abre el formulario con los datos cargados; corregir a `CUPU800825569` (612, G03) → reintentar ese cobro → "Facturado" (US4-2). Y que un error de conexión (interceptar la ruta con `page.route` → 500) se muestra como genérico, nunca como rechazo del SAT.

### Implementation for User Story 4

- [X] T038 [US4] En `apps/customer-app/components/invoicing/InvoiceConfirm.tsx`, caso `FISCAL_DATA_REJECTED`: mostrar `t.invoicing.errors.FISCAL_DATA_REJECTED` + el `detail` tal cual (sin traducir) y un botón "Corregir mis datos" → `onEditFiscalProfile(chargeId)`. En `InvoicingClient.tsx`, ese callback abre el formulario y al guardar vuelve a la confirmación del mismo cobro (reusar el flujo de T032). Hace pasar T037. (depende de T032)

**Checkpoint**: las 4 historias funcionan con el mock.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T039 [P] Integración de rutas contra el backend local en `apps/customer-app/tests/integration/account.auth.test.ts` (o `invoicing.auth.test.ts` junto a él, mismo patrón `bogusApi` + `requireBackend`): las 5 llamadas de `InvoicingHttpDatasource` existen (no 404) y el guard responde 401. Correr con el backend en `:3001` (`pnpm --filter customer-app test:integration`). Sin User Pool, la comparación campo por campo mock ↔ HTTP de rutas autenticadas no se puede hacer aquí: la cubren T010 (formas del datasource HTTP), T004/T005 (e2e del backend) y el test de llaves de T009.
- [X] T040 [P] Revisar i18n: recorrer `/invoicing` en `/en/invoicing` y confirmar que no queda texto en español fuera de datos fiscales, descripción del cobro y motivo del SAT (FR-016); agregar al Playwright un caso en inglés que verifique una etiqueta de estado y el formato del monto.
- [X] T041 [P] Documentar en `apps/customer-app/CLAUDE.md` una sección "Facturar (CFDI) — 2026-09-23": página `/invoicing`, rutas de `app/api/invoicing/*`, repositorio en customer-core, filtro régimen↔uso, RFC `XAXX010101000` como rechazo del mock, enlace de WhatsApp, y "sin probar contra Facturapi".
- [X] T042 [P] Actualizar `apps/backend/CLAUDE.md` ("Facturación CFDI → Pendiente"): customer-app hecho; queda mobile-app, branch-app y owner-panel. Documentar `MemberCharge.invoice.uuid`. Y en `packages/api-client/README.md`, `put` y `getFile`.
- [ ] T043 Correr la validación completa de `specs/001-member-cfdi-invoicing/quickstart.md` (sección 1 automática + los 13 pasos a mano con el mock) y anotar cualquier desviación. (depende de todo lo anterior)
  - 2026-09-25: secciones 1 (salvo Playwright) y 3 en verde — api-client 34, customer-core 158, customer-app 189, e2e de facturación del backend 17, integración de rutas 23 (401, no 404), typecheck y lint. **Falta**: los 13 pasos a mano de la sección 2 y el Playwright de `/invoicing`; ambos requieren un User Pool vivo (`terraform apply -target=module.cognito`, con OK explícito del dueño).
  - **Estado (2026-09-23)**: sección 1 hecha salvo Playwright — api-client 32, customer-core 124, customer-app 180 (incluye rutas), backend 271 unit + 145 e2e, integración de rutas 23 contra backend local, `next build` OK, mobile/branch/owner sin regresiones. PENDIENTE: Playwright (`tests/e2e/invoicing.spec.ts`) y los 13 pasos a mano — los dos necesitan User Pool vivo (customer-app no tiene login mock).
- [X] T044 `pnpm turbo run typecheck lint test` en verde en todo el monorepo (los otros 4 frontends compilan con el `ApiClient` ampliado). (depende de T043)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias. T001, T002 y T004 arrancan juntas.
- **Foundational (Fase 2)**: T014 necesita T001; T016 necesita T003. Bloquea todas las historias.
- **US2 (Fase 3)** → **US1 (Fase 4)**: US1 reusa el formulario de US2 para FR-011.
- **US3 (Fase 5)**: necesita `ChargeList` (T030) de US1; independiente de US2 (usa el cobro
  `invoiced` de la semilla).
- **US4 (Fase 6)**: necesita `InvoiceConfirm` y el flujo de T032.
- **Polish (Fase 7)**: al final.

### Grafo

```text
T001 ─┬─▶ T005 (con T004)
      └─▶ T014 ─┬─▶ T015 ─┬─▶ T018 ─▶ T021 ─▶ [US2] ─▶ [US1] ─┬─▶ [US3]
T002 ─▶ T003 ──┴─▶ T016 ──┘                                  └─▶ [US4]
T006 ─▶ T011 ─▶ T015, T017, T025
T007 ─▶ T012 ─▶ T030
T008 ─────────▶ T030
T013 ─▶ T015, T016
```

### Within Each User Story

- Test primero y fallando → route handler → componentes → integración en `InvoicingClient`.
- Cerrar la historia (checkpoint) antes de la siguiente.

### Parallel Opportunities

- Fase 1: T001, T002, T004.
- Fase 2: tests T006, T007, T009, T010 y `formatDateTime` (T008, test + implementación) juntos;
  luego T011, T012, T013 juntos; T019, T020, T022 en cualquier
  momento de la fase.
- US1: T027, T028 y T030 en paralelo con T029.
- US3: T033 y T035 en paralelo con T034.
- Polish: T039–T042 en paralelo.

---

## Parallel Example: Fase 2

```bash
# Tests primero, en paralelo:
Task: "Tests del catálogo fiscal en packages/customer-core/src/fiscal.test.ts"
Task: "Tests de formatMoney en packages/customer-core/src/pricing.test.ts"
Task: "formatDateTime + test en packages/customer-core/src/dates.ts"
Task: "Tests del mock en packages/customer-core/src/mock/invoicing.mock.test.ts"
Task: "Tests de InvoicingHttpDatasource en packages/customer-core/src/http/http.test.ts"

# Luego la lógica pura, en paralelo:
Task: "fiscal.ts"   Task: "formatMoney en pricing.ts"   Task: "invoicing-errors.ts"
```

## Parallel Example: User Story 1

```bash
Task: "Playwright de facturar en apps/customer-app/tests/e2e/invoicing.spec.ts"
Task: "ChargeList en apps/customer-app/components/invoicing/ChargeList.tsx"
Task: "POST route en apps/customer-app/app/api/invoicing/charges/[chargeId]/invoice/route.ts"
```

---

## Implementation Strategy

### MVP (US2 + US1)

1. Fase 1 + Fase 2.
2. US2 (datos fiscales) → validar sola.
3. US1 (facturar) → validar. **Aquí ya hay MVP**: el socio captura datos y factura.
4. Commit / PR si se quiere entregar por partes.

### Incremental

5. US3 (descargas + WhatsApp) → validar.
6. US4 (rechazo del SAT) → validar.
7. Polish: integración, i18n, docs, quickstart completo.

---

## Notes

- [P] = otro archivo, sin dependencias incompletas.
- Cada historia se valida con el mock (default); la validación contra backend va en T039 y en
  la sección 3 del quickstart.
- Nada de esto se prueba contra Facturapi real (no hay cuenta).
- Commit por tarea o grupo lógico, en una rama `001-member-cfdi-invoicing`, nunca directo a `main`.
