# Research: Facturación del socio (CFDI) en la web

Fase 0 del plan. Cada decisión: qué se eligió, por qué y qué se descartó.

## R1. Dónde vive el contrato y los datasources

- **Decision**: nuevo `IInvoicingRepository` en `@mucho-loco/customer-core/contract`, con
  `InvoicingMockDatasource` en `./mock` e `InvoicingHttpDatasource` en `./http`.
  customer-app solo elige cuál en `lib/repositories/invoicing.repository.ts`, igual que
  `payment.repository.ts`.
- **Rationale**: principio III — mobile-app va a necesitar exactamente lo mismo (spec aparte);
  todos los dominios del socio ya viven así.
- **Alternatives considered**: meterlo en `IUserRepository` (ya tiene 5 métodos de otra cosa, y
  facturación tiene sus propios errores); dejarlo en customer-app (habría que moverlo cuando
  llegue el spec de mobile-app).

## R2. Errores tipados

- **Decision**: `@mucho-loco/customer-core/invoicing-errors` con `InvoicingError` (lo que tira el
  mock) e `invoicingErrorOf(e)` que devuelve código (y `detail`) tanto de `InvoicingError` como de un
  `ApiRequestError` con `code` conocido, y `null` para todo lo demás. Mismo patrón exacto que
  `membership-errors.ts`. Códigos: `FISCAL_PROFILE_REQUIRED`, `CHARGE_NOT_FOUND`,
  `CHARGE_ALREADY_INVOICED`, `INVOICING_WINDOW_CLOSED`, `CHARGE_NOT_INVOICEABLE`,
  `INVOICING_UNAVAILABLE`, `FISCAL_DATA_REJECTED`, `INVOICING_PROVIDER_ERROR`, `CFDI_NOT_FOUND`.
  `FISCAL_DATA_REJECTED` conserva el motivo del SAT (campo `detail` del cuerpo del 4xx).
- **Rationale**: principios I y II — mock y HTTP fallan igual; un 500 o red caída no se disfraza
  de rechazo (FR-014, edge case "fallo que no es de negocio").
- **Alternatives considered**: leer el `message` en prosa (frágil, en español); un solo error
  genérico (viola SC-003).
- **Nota**: `FISCAL_PROFILE_NOT_FOUND` no es error de la UI: el datasource HTTP usa `getOrNull` y
  "sin datos fiscales" es `null` (US2 escenario 1: invitar, no mostrar error).

## R3. PUT y descargas binarias en `@mucho-loco/api-client`

- **Decision**: agregar dos métodos al cliente compartido: `put<T>(path, body, opts)` (el backend
  guarda datos fiscales con `PUT /users/me/fiscal-profile`) y
  `getFile(path, opts): Promise<ApiFile>` con `{ data: Uint8Array; contentType: string;
  filename: string | null }`, que lee `arrayBuffer()` en vez de `text()` y saca el nombre de
  `Content-Disposition`. Errores, timeout y token, iguales que `get`.
- **Rationale**: hoy el cliente solo tiene `get`/`getOrNull`/`post` y lee todo como texto; un
  PDF leído como texto se corrompe. La lógica de URL, token, timeout y errores ya vive ahí
  (principio III); un `fetch` suelto en el route handler la duplicaría.
- **Alternatives considered**: `fetch` crudo en el route handler (tercera copia de timeout +
  token + traducción de errores); redirigir el navegador al backend (el token vive en una
  cookie httpOnly del dominio de Vercel, el navegador no puede mandar `Authorization`).
- **Impacto**: aditivo, no cambia a los otros 4 frontends. Tests en `index.test.ts`.

## R4. Cómo llegan lecturas y escrituras al navegador

- **Decision**:
  - **Lectura** en el Server Component de `app/[locale]/(account)/invoicing/page.tsx`:
    `getFiscalProfile` + `getCharges` en paralelo, igual que `membership/page.tsx`.
  - **Escrituras** por Route Handlers (`app/api/invoicing/...`), que son los únicos que leen la
    cookie `ml_session` y comparten instancia del mock con el Server Component:
    `PUT /api/invoicing/fiscal-profile`, `POST /api/invoicing/charges/[chargeId]/invoice`.
  - **Descarga** por `GET /api/invoicing/invoices/[cfdiId]/[format]`, que responde el binario con
    `Content-Type` y `Content-Disposition: attachment` — el navegador la abre con un `<a download>`.
  - Tras facturar, el handler devuelve el cobro actualizado (se relee la lista) para cumplir
    FR-012 sin recargar; tras un rechazo por cambio de estado (`CHARGE_ALREADY_INVOICED`,
    `INVOICING_WINDOW_CLOSED`) también devuelve la lista fresca (FR-014).
- **Rationale**: es el patrón de `api/orders` y `api/membership/*`; el comentario de
  `api/orders/route.ts` explica por qué llamar al repositorio desde el cliente rompería el mock.
- **Alternatives considered**: Server Actions (no se usan en el repo; mezclaría dos patrones).

## R5. Ruta protegida

- **Decision**: agregar `/invoicing` a `PROTECTED_PATHS` en `lib/auth.ts`; los handlers de
  `app/api/invoicing/*` validan sesión ellos mismos (el middleware no cubre `/api`), y la
  página redirige a `/account` si no hay sesión, como `membership/page.tsx`.
- **Rationale**: FR-017 y la regresión de seguridad de 2026-09-10 (cookie fabricada) que ya
  cubren los e2e.

## R6. Filtro régimen ↔ uso de CFDI

- **Decision**: `@mucho-loco/customer-core/fiscal` con `TAX_SYSTEMS` (clave + nombre es/en),
  `CFDI_USES` y `allowedCfdiUses(taxSystem)`. Según el catálogo `c_UsoCFDI` del SAT (CFDI 4.0):
  G01 y G03 solo para 601, 603, 606, 612, 620, 621, 622, 623, 624, 625 y 626; S01 para todos.
  O sea 605, 607, 608, 610, 611, 614, 615 y 616 solo admiten S01. Más `normalizeFiscalText`
  (trim + mayúsculas) y `isRfcShape`/`isZipShape`, con las mismas expresiones que
  `FiscalProfileDto` del backend.
- **Rationale**: FR-002/FR-003; lógica pura, testeable y compartida con mobile-app. El backend
  solo valida forma (su DTO) y el SAT el fondo; el filtro es comodidad, no seguridad.
- **Alternatives considered**: servir el catálogo desde el backend (endpoint nuevo para una tabla
  que cambia cada varios años); hardcodear en el componente (no testeable, no compartible).
- **Riesgo**: si el SAT cambia el catálogo, la tabla queda vieja; el rechazo del SAT sigue
  mostrándose con su motivo (US4). Revisar la tabla contra el catálogo vigente al implementar.

## R7. Hueco de contrato: folio fiscal (UUID) para WhatsApp

- **Decision**: agregar `uuid: string | null` a `MemberCharge.invoice` en `@mucho-loco/types`, y
  que `InvoicingService.getCharges` incluya el `Cfdi` del recibo para llenarlo. Solo se llena
  cuando `status === 'invoiced'` (en `closed` el `cfdiId` apunta a la factura global, que no es
  del socio). e2e del backend actualizado.
- **Rationale**: FR-020 pide el folio en el mensaje, y el folio es con lo que HQ busca y cancela
  en `/invoicing/cfdis`. Hoy `MemberCharge` solo trae `cfdiId` (id interno).
- **Alternatives considered**: mandar solo `cfdiId` (HQ no lo ve en su pantalla); mandar
  descripción + fecha (ambiguo si hay dos cobros iguales el mismo día).
- **Impacto**: cambio aditivo en backend (sin migración: el dato ya existe en `Cfdi.uuid`).

## R8. Número de WhatsApp de soporte

- **Decision**: mover `WHATSAPP` de `components/landing/Contact.tsx` a `lib/contact.ts` y
  reusarlo; el mensaje se arma con `t` (es/en) y `encodeURIComponent`, formato
  `https://wa.me/<número>?text=...`.
- **Rationale**: un solo número; hoy es una constante local del componente.

## R9. Doble envío

- **Decision**: el botón de facturar se deshabilita mientras la solicitud está en curso
  (`useAsyncSubmit` o estado local equivalente). La garantía real de "nunca dos facturas" es
  del backend (idempotencia por recibo, ya probada en su e2e); el mock la imita: facturar un
  cobro ya facturado tira `CHARGE_ALREADY_INVOICED`.
- **Rationale**: SC-004; el frontend no puede garantizarlo solo (dos pestañas).

## R10. Datos del mock

- **Decision**: el mock arranca con cobros en los cuatro estados (`available` ×2, `invoiced`,
  `closed`, `unavailable`) por socio, en memoria y por correo como `UserMockDatasource`, sin
  datos fiscales. Emite facturas con folio falso; un RFC de prueba fijo
  (`XAXX010101000`, el RFC genérico) hace que el mock responda `FISCAL_DATA_REJECTED` con un
  motivo realista, para poder probar US4 sin backend. La descarga devuelve un PDF mínimo
  válido y un XML de ejemplo.
- **Rationale**: FR-018/SC-005 y principio I — todas las historias se prueban con el mock.

## R11. Idioma, fechas y montos

- **Decision**: textos nuevos en `messages/{es,en}.json` de customer-core bajo `invoicing`;
  fechas con un `formatDateTime(iso, lang)` nuevo en `customer-core/dates` (`paidAt` es un
  instante → hora local; `formatDate` fija UTC y serviría solo para fechas sin hora; customer-app
  no tiene `formatDateTime`, se copia el de branch-app); montos con un `formatMoney(amount, lang)` nuevo en `customer-core/pricing` (siempre 2
  decimales, `MXN`). `formatPrice` existente no sirve: redondea a enteros según el locale del
  runtime y es el formato de catálogo, no de un comprobante.
- **Limitación conocida**: `MemberCharge.description` llega del backend ya armada en español
  ("… y 2 más"). Es un recibo congelado (principio IV) y no se retraduce; si molesta en inglés,
  arreglarlo es un cambio de contrato aparte (mandar el conteo de renglones).

## R12. Pruebas

- **Decision**:
  - Vitest en customer-core: `fiscal.test.ts` (filtro, normalización, formas),
    `invoicing-errors` vía `http.test.ts` (ruta, método, token, 404→null, traducción de cada
    código), `invoicing.mock` (estados, rechazo del SAT, doble factura).
  - Vitest en api-client: `put` y `getFile`.
  - Vitest en customer-app: `invoicing.repository.test.ts` (mismo contrato).
  - Backend: e2e de `invoicing.e2e-spec.ts` extendido para `invoice.uuid`.
  - Playwright: `tests/e2e/invoicing.spec.ts` con el mock — capturar datos, facturar, ver
    "Facturado", rechazo del SAT y corrección, descarga, enlace de WhatsApp, `/invoicing` sin
    sesión redirige.
  - Integración de rutas del datasource HTTP contra el backend local (principio V), fuera de CI.
- **No se prueba** contra Facturapi real (no hay cuenta — spec, supuestos).
