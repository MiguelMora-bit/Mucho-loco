# CLAUDE.md — apps/customer-app

Visión de negocio completa y estructura del monorepo: ver [`CLAUDE.md`](../../CLAUDE.md) en la raíz.

## Qué es este app

Tienda y app de membresías para "Mucho Loco Gym". Next.js 14 con App Router y TypeScript strict mode. El diseño original fue un prototipo HTML estático + React vía Babel; este repo es la migración idiomática a Next.js.

El backend de dominio (NestJS + RDS Postgres, ver CLAUDE.md raíz) se construirá después, probablemente como `apps/backend` aparte — todos los datos de negocio (productos, pedidos, membresías) siguen siendo mock. **Auth es la excepción**: desde 2026-09-09 es real contra Cognito (ver "Auth flow" abajo), adelantado porque no depende del contrato de API del resto del backend.

## Arquitectura

- **App Router** — todo en `app/`. No usar Pages Router.
- **'use client'** — solo en componentes con hooks/browser APIs. El componente principal `MuchoLoco.tsx` es `'use client'` porque usa `useState`, `useEffect`, canvas y localStorage.
- **Server Components** — las páginas de rutas son Server Components por defecto. Solo marcar como cliente cuando sea necesario.
- **i18n** — `next-intl`, rutas bajo `app/[locale]/`. Config en `i18n/routing.ts` y `i18n/request.ts`. Los mensajes viven en `@mucho-loco/customer-core/messages/{es,en}.json` desde 2026-09-12 (los comparte mobile-app); `request.ts` los importa con un mapa estático, no con un template literal.
- **Middleware** — `middleware.ts` en la raíz del app protege `/dashboard`, `/performance`, `/checkout` verificando la cookie `ml_session` (constantes en `lib/auth.ts`), y corre el middleware de `next-intl` para el locale.
- **Route Handlers** — `app/api/auth/{register,confirm,resend-code,login,logout}/route.ts` hablan con Cognito real (`lib/cognito.ts`). El browser nunca llama a AWS directo, solo a estas rutas.
- **Capas en `lib/`** — `repositories/` (acceso a datos), `datasources/http/`, `stores/` (zustand: `auth.store.ts`, `cart.store.ts`), `hooks/` (`useT.ts` para traducciones).
- **`@mucho-loco/customer-core`** (2026-09-12) — lo que este app comparte con mobile-app: las interfaces `I*Repository` (`./contract`), los datasources mock (`./mock`), el catálogo semilla (`./data`), `pricing`/`dates`/`order-status` y los mensajes. `lib/data.ts`, `lib/pricing.ts`, `lib/dates.ts` y `lib/orderStatus.ts` quedan como re-exports de una línea para no tocar a sus ~25 importadores; código nuevo puede importar del paquete directo. Next lo compila vía `transpilePackages` (`next.config.mjs`) porque es TypeScript sin compilar con código de runtime.

## Tipos compartidos

Los tipos de dominio (`Branch`, `Product`, `CartItem`, `UserProfile`, etc.) viven en el paquete de workspace `@mucho-loco/types` (`packages/types/src/index.ts`), no en este app. Importar siempre como `import type { X } from '@mucho-loco/types'`. Si se agrega un tipo nuevo que otro app del monorepo también necesitará (ej. `branch-app`, `backend`), agregarlo ahí — si es exclusivo de este app, se queda local.

## Estilos

`app/globals.css` = concatenación de `styles.css` + `sections.css` + `mobile.css` del diseño original, ahora reescrito con Tailwind v3 (`@layer components` al final del archivo para estilos de página). Variables CSS (`--red`, `--cream`, `--black`, `--border`, etc.) siguen usándose para algunos estilos inline.

## Fuentes

Cargadas con `next/font/google` en `layout.tsx`: `'Anton'`, `'Bebas Neue'`, `'Inter'`, `'JetBrains Mono'`, `'Permanent Marker'` — expuestas como variables `--font-*` en el `<html>`.

## Auth flow (real, Cognito — decidido/implementado 2026-09-09)

Un solo User Pool compartido para toda la cadena de apps (`infra/modules/cognito` en la raíz), con Grupos `staff`/`manager`/`owner` para roles internos — la ausencia de esos grupos en el JWT implica rol `customer`. Ver CLAUDE.md raíz, sección "Arquitectura de backend".

```
Registro:
  SignupForm → POST /api/auth/register (SignUpCommand)
    → Cognito manda código por email → tab 'confirm'
    → ConfirmForm → POST /api/auth/confirm (ConfirmSignUpCommand + auto-login)
    → cookie ml_session (ID token real) → router.push(next || '/dashboard')

Login:
  Usuario sin sesión → /dashboard → middleware → /account?next=/dashboard
    → LoginForm → POST /api/auth/login (InitiateAuth USER_PASSWORD_AUTH)
    → cookie ml_session (ID token real) → router.push(next || '/dashboard')
```

- El middleware SOLO verifica que `ml_session` exista, no valida el JWT — el flujo de rutas protegidas no cambió. La validación real (firma + expiración + issuer + audience contra el JWKS de Cognito) vive en `lib/jwt.ts` (`verifyIdToken`, `jose`), llamada por `getCurrentUserEmail()` en cada página/ruta protegida — ver "Auditoría de seguridad" abajo. **Antes (hasta 2026-09-10) solo se decodificaba el payload sin verificar firma** — cualquiera podía editar la cookie a mano en devtools con un JWT fabricado y suplantar a otro usuario. `dashboard/page.tsx` redirige a `/account` y `POST /api/orders` responde 401 si `getCurrentUserEmail()` no puede verificar el token — antes seguían adelante con un email vacío/por defecto.
- **Refresh automático (2026-09-09):** `ml_session` (ID token) dura 60 min, igual al `id_token_validity` del App Client en Terraform. `ml_refresh` (refresh token, 30 días — `refresh_token_validity` en Terraform) se guarda aparte en login/confirm. `SessionRefresher`/`useSessionRefresh` (`lib/hooks/useSessionRefresh.ts`) se monta en las 3 páginas protegidas (`(account)/layout.tsx` para dashboard/performance, `CheckoutClient` para checkout) y cada 15 min llama `POST /api/auth/refresh` (`REFRESH_TOKEN_AUTH`) para renovar `ml_session` sin pedir contraseña. El refresh token no rota — Cognito no devuelve uno nuevo en `REFRESH_TOKEN_AUTH`. Si el refresh falla (token revocado/expirado a los 30 días), se limpia todo y se manda a `/account`.
- Errores de Cognito se mapean a códigos cortos (`lib/cognito-errors.ts`) → `{ error: 'CODE' }` en la respuesta → `AccountClient` los traduce vía `t.account.errors.*`. Nunca se le muestra al usuario el mensaje crudo de AWS.
- Self-signup abierto solo para clientes (rol implícito). Cuentas de staff/gerente/dueño se dan de alta con `AdminCreateUser` + `AdminSetUserPassword` (nunca self-signup) — mismo patrón que usa `tests/e2e/global-setup.ts` para el usuario fijo de e2e.
- **Login social (decidido/implementado 2026-09-11): Google y Facebook**, vía Hosted UI de Cognito (`infra/modules/cognito`) — a diferencia del login normal (`InitiateAuth` directo), la federación con un IdP externo requiere el flujo OAuth de redirect, no hay forma de hacerlo por SDK server-to-server:
  ```
  SocialButtons (<a href="/api/auth/social/start?provider=Google&next=...">)
    → GET /api/auth/social/start: genera PKCE (verifier/challenge S256) + state (nonce + next path),
      guarda {nonce, verifier} en cookie httpOnly de corta vida (ml_oauth, path /api/auth/social)
      → redirect 302 a <COGNITO_DOMAIN>/oauth2/authorize?identity_provider=Google&...
        (identity_provider salta el picker de Hosted UI, va directo al consent screen de Google/Facebook)
    → Cognito redirige a GET /api/auth/social/callback?code=...&state=...
      → valida nonce (CSRF) contra la cookie, intercambia code en <COGNITO_DOMAIN>/oauth2/token
        (grant_type=authorization_code + code_verifier, sin client_secret — cliente público)
      → verifyIdToken() + cookie ml_session igual que login normal → redirect a next (o /dashboard)
  ```
  Sin `code_verifier`/nonce válidos o si Cognito devuelve `error`, redirect a `/account?error=SOCIAL_LOGIN_FAILED` (mapeado a `t.account.errors.socialLoginFailed`, mismo patrón que los demás códigos de error). Lógica de PKCE/state en `lib/pkce.ts` (con tests en Vitest). Solo el app client `web` tiene los IdPs habilitados — staff/gerente/dueño (`owner_panel`, `branch_app`) siguen siendo email/password únicamente. Sin cuenta linking: el mismo email por Google vs Facebook vs password crea usuarios separados en Cognito (comportamiento default, aceptado por ahora).
- Variables de entorno: `COGNITO_REGION`, `COGNITO_CLIENT_ID`, `COGNITO_DOMAIN` (Hosted UI, solo login social) — runtime; `COGNITO_USER_POOL_ID` solo test e2e — ver `.env.example`. Vienen de `terraform output` en `infra/envs/dev`. Las credenciales de Google/Facebook viven en `infra/envs/dev/terraform.tfvars` (gitignored, no en este app) — ver CLAUDE.md raíz.

## Convenciones

- TypeScript strict mode. Todos los archivos son `.ts`/`.tsx`.
- Tailwind v3 para estilos nuevos; clases CSS del diseño original en `globals.css` para lo heredado.
- No `next/image` de momento — el diseño usa `<img>` con assets locales en `/public/assets/`. Migrar a `next/image` cuando se optimice el rendimiento.
- `useSearchParams()` siempre dentro de `<Suspense>` (requisito Next.js 14 App Router).
- Las rutas de producto usan `useParams()` del lado cliente.

## Comandos

Desde la raíz del monorepo (recomendado, usa Turborepo):
```bash
pnpm --filter customer-app dev
pnpm --filter customer-app build
```
O parado en este directorio: `pnpm dev`, `pnpm build`, `pnpm start`.

## Testing

- **Vitest** (`pnpm test` / `pnpm test:watch`) — unit tests de `lib/repositories/*.ts` (contrato de datos que el backend real va a tener que cumplir en Fase 2+) y de lógica pura extraída a `lib/` (`i18n-href.ts`, `cognito-errors.ts`). Los tests de `pricing`/`dates`/`orderStatus` se mudaron con su código a `packages/customer-core`. No hay tests de componentes React todavía — se agregan cuando el UI deje de estar en movimiento.
- **Playwright** (`pnpm test:e2e`) — E2E de los flujos críticos en `tests/e2e/`: navegación (incluye regresión del bug del splash), auth + redirects de rutas protegidas (incluye una cookie `ml_session` fabricada a mano, rechazada tanto en `/dashboard` como en `POST /api/orders` — regresión de la auditoría de seguridad 2026-09-10), y shop → checkout → el pedido aparece en el dashboard. `playwright.config.ts` levanta el dev server solo si no hay uno corriendo ya, y fija `locale: 'es-MX'` porque el Accept-Language default de Chromium (en-US) hace que next-intl negocie inglés y rompa los asserts en español.
- Al agregar una página/feature nueva con lógica no trivial: si es lógica pura (cálculo, formateo, contrato de repository), Vitest; si es un flujo de usuario (click, navegación, formulario), un spec de Playwright.

## Pendiente / conocido

- `README.md` de este app menciona "CSS puro (sin Tailwind)" — desactualizado, el proyecto ya usa Tailwind v3. Pendiente de actualizar.
- **Decidido (2026-08-30): no hay formulario de contacto.** WhatsApp gana para este mercado — más natural que un form y ya es el tono de marca. El link `wa.me` en `Contact` (componente `MuchoLoco.tsx`) ya es funcional. Las claves `contact.name/email/branch/message/send` en `messages/*.json` quedan sin usar; no se borran todavía por si más adelante se justifica un form real con lead-capture. Notificaciones automáticas (avisos de vencimiento, pedido listo) van por WhatsApp Business Platform cuando exista backend — ver `CLAUDE.md` root.
- ~~**Cifras de relleno en el inicio del panel**~~ ✅ Resuelto (2026-09-25, spec 013): las cuatro tarjetas de `HomePane` son del socio — visitas del mes con "+N vs mes anterior" (`visitsDeltaLabel` de customer-core, verde solo si sube), racha con "Mejor racha: N", días restantes con su plan, y sucursales distintas del mes. Salen de `MembershipInfo.{visitsLastMonth,bestStreak,branchesThisMonth}`, que el backend deriva de las entradas reales (spec 012). Los mensajes ya no llevan números.
- Rutas en inglés (`/account`, `/dashboard`, `/performance`, `/product/[id]`, `/checkout`, `/membership`) por preferencia explícita del usuario (2026-08-30) — el copy/contenido del sitio se queda en español.
- **Resuelto (2026-08-30):** checkout ya crea un pedido real vía `POST /api/orders` (server-side) que `userRepository.getOrders()` refleja — por eso un pedido nuevo SÍ aparece en el dashboard. `product/[id]` y `performance` siguen sin persistir nada (no hay acción de usuario ahí que debiera hacerlo).
- **Resuelto (2026-09-02):** `next-intl` antes solo cubría landing + product — Account/Dashboard/Checkout/Performance estaban 100% hardcodeados en español sin pasar por `useT()`. Ya están completos, siguiendo el mismo patrón (`useT()` una vez en la raíz del subtree, `t` como prop hacia abajo). `Product.name`/`.flav` y `FeedPost.cap` pasaron de `string` a `LocalizedString` (mismo patrón que `Announcement`/`MembershipTier`) para que el catálogo también cambie de idioma; `OrderItem.name`/`.flav` se quedan `string` a propósito (un pedido es un recibo congelado en el idioma de compra, no se retraduce). Fechas (`Order.date`, `PersonalRecord.date`, `Workout.date`) pasaron de string pre-formateado en español a ISO + `lib/dates.ts` (`Intl.DateTimeFormat`) para que sí cambien con el locale. Pendiente, fuera de este alcance: `Visit.day`/`.month` y `MOCK_PROFILE.birthdate` tienen el mismo defecto latente pero no se tocaron (los datos semilla actuales no lo evidencian).

## Patrón: página server component + client component

`dashboard` (`DashboardClient`), `product/[id]` (`ProductClient`) y `performance` (`PerformanceClient`) siguen el mismo patrón: el `page.tsx` es un Server Component async que llama al repository correspondiente y pasa los datos como props; el componente en `components/` es `'use client'` y solo maneja estado de interacción (tabs, cantidad, modales). Nuevas páginas con datos + interactividad deberían seguir esta misma división — así el swap de mock a API real (Fase 5 de la metodología) solo toca el `page.tsx`, nunca el componente cliente.

## Membresía: contratar y pagar (2026-09-13)

Un socio nuevo ya no nace con membresía: `getMembership()` devuelve `null` hasta su primer cobro (mismo contrato en mock y HTTP — el backend responde 404). Detalle del cobro en "Membresías con Stripe Billing" de `apps/backend/CLAUDE.md`.

- **`/membership`** (protegida, `app/[locale]/(account)/membership/` + `components/MembershipCheckoutClient.tsx`): sucursal, tier y periodo → `POST /api/membership/checkout` → Stripe. El landing manda aquí con `?plan=&period=&branch=`, y el middleware ahora conserva la query en `next`, así el plan elegido sobrevive al login. El precio que se ve es vista previa (`PERIOD_MULTIPLIERS` de customer-core); el que se cobra lo calcula el backend.
- **Panel**: sin membresía → "ELEGIR PLAN"; `?membership=paid` sin membresía activa → "confirmando tu pago" (volver de Stripe no activa nada, lo activa el webhook); gracia → `POST /api/membership/invoice` abre la factura pendiente en Stripe (reemplaza al `retry-payment` falso); suspendida → `/membership`; con suscripción → "se renueva sola el …" y sin banner de renovar.
- Las reglas de contratación (qué rechazaría el backend, desde cuándo respetar lo ya pagado) viven en `@mucho-loco/customer-core/membership-rules`, compartidas con el móvil y el mock. `renewalStartsOn()` lee el reloj, así que se llama en el Server Component: el lint de React prohíbe `Date.now()` durante el render de un componente.
- Los rechazos (`ALREADY_SUBSCRIBED`, `MEMBERSHIP_STILL_ACTIVE`, `NOTHING_TO_PAY`) se leen igual en mock y HTTP con `membershipErrorCode()` de `@mucho-loco/customer-core/membership-errors`; los route handlers responden 409 con `{ error: code }`.
- "Recoger en gym" exige membresía (sale de su sucursal). Por eso `tests/e2e/shop-checkout.spec.ts` contrata una (mock) antes de comprar.
- **Sin verificar en navegador**: el panel y `/membership` solo pasaron typecheck, lint y unit tests — sin User Pool vivo no hay sesión para abrirlos. El mismo flujo en el móvil sí se recorrió en Playwright (modo mock).

## Facturar (CFDI) — 2026-09-23

Spec, plan y tareas en `specs/001-member-cfdi-invoicing/` (primera funcionalidad hecha con Spec Kit). El backend ya existía ("Facturación CFDI" en `apps/backend/CLAUDE.md`); esto es su frontend web.

- **`/invoicing`** (protegida: `PROTECTED_PATHS` + redirect en la página), `app/[locale]/(account)/invoicing/page.tsx` + `components/invoicing/`. Acceso desde el sidebar. `?charge=<id>` abre directo la confirmación de ese cobro. Arriba los datos fiscales (formulario o resumen con "EDITAR"), abajo los cobros con su estado: Facturable / Facturado / Ya no facturable (entró a la global) / No facturable.
- **Contrato en customer-core**, listo para mobile-app: `IInvoicingRepository` (`./contract`), `InvoicingMockDatasource` (`./mock`), `InvoicingHttpDatasource` (`./http`), rechazos tipados con `invoicingErrorOf()` (`./invoicing-errors`) y el catálogo SAT con el filtro régimen ↔ uso de CFDI (`./fiscal`: 605, 607, 608, 610, 611, 614, 615 y 616 solo admiten S01). Aquí solo `lib/repositories/invoicing.repository.ts` elige cuál.
- **Rutas** (`app/api/invoicing/*`, validan sesión solas): `PUT fiscal-profile` (400 por campo con `validateFiscalProfile`), `POST charges/[chargeId]/invoice` (devuelve `{ cfdi, charges }`; los rechazos por cambio de estado traen la lista fresca) y `GET invoices/[cfdiId]/[format]` (binario, `private, no-store`). Probadas en `app/api/invoicing/route.test.ts`.
- **Mock**: cada socio arranca sin datos fiscales y con un cobro de cada estado. El RFC `XAXX010101000` (público en general) hace que "el SAT" rechace, para ver ese error sin Facturapi. `NO_CHARGES_TEST_EMAIL` = pantalla vacía.
- **Corregir una factura mal emitida** no se hace aquí: "¿Datos incorrectos?" abre WhatsApp de soporte (`lib/contact.ts`, el mismo número del landing) con el folio; HQ cancela y el cobro vuelve a ser facturable.
- `lib/api-client.ts` (`postJson`/`putJson` del navegador): `ApiError` ahora trae `status` y el cuerpo (`data`), para distinguir un 401 (sesión expirada → `/account?next=`) y leer `detail`/`charges`.
- La descripción del cobro llega del backend en español (es el concepto fiscal) y no se traduce — limitación conocida.
- **Sin verificar en navegador**: typecheck, lint, `next build`, unit (rutas incluidas) e integración de rutas contra el backend local. `tests/e2e/invoicing.spec.ts` está escrito pero necesita User Pool vivo para correr. **Sin probar contra Facturapi** (no hay cuenta).

## Registro con teléfono (2026-09-25)

Spec 007. `SignupForm` pide teléfono (obligatorio, con la nota de que ahí llegan los avisos de WhatsApp) en lugar del cumpleaños, que nunca se enviaba. `AccountClient` valida con `toE164` de customer-core antes de enviar; `/api/auth/register` revalida (400 `INVALID_PHONE`) y agrega `phone_number` a Cognito — el backend lo guarda al crear al socio. Tests en `app/api/auth/register/route.test.ts`. Sin probar el registro de punta a punta (necesita User Pool vivo).

**Completar o cambiar el teléfono (spec 015)**: quien entra con Google/Facebook no da teléfono y sin él no hay avisos de WhatsApp. El inicio del panel muestra "Agrega tu teléfono" con el campo (`components/dashboard/PhoneForm.tsx`) cuando falta, y el perfil ofrece "Cambiar". `PUT /api/profile/phone` valida con `toE164` (400 `INVALID_PHONE`) y llama `userRepository.updatePhone`; `DashboardClient` reemplaza el perfil con el que devuelve. De paso, el perfil ya no pinta un renglón de cumpleaños vacío. Tests: `app/api/profile/phone/route.test.ts` e integración (401, no 404). **La UI web no se probó en navegador** (entrar necesita User Pool); la misma lógica compartida sí, en el walkthrough del móvil.

## Administrar suscripción — portal de Stripe (2026-09-24)

Spec en `specs/005-stripe-billing-portal/`. En el inicio del panel, junto a "Se renueva sola el …", el botón "Administrar suscripción" → `POST /api/membership/portal` → portal hospedado de Stripe (cancelar/reactivar la renovación, cambiar tarjeta) y regreso al panel, que el Server Component relee. Con la renovación cancelada (`hasSubscription && !autoRenews`) el panel lo dice con banner y "Reactivar renovación" (también en el portal): NO manda a contratar un plan nuevo, porque la suscripción sigue viva y el backend respondería `ALREADY_SUBSCRIBED`. `purchaseBlock` de customer-core usa `hasSubscription` por lo mismo. En mock, cada visita al "portal" alterna la renovación.

## Pedidos a domicilio: dirección de envío (2026-09-14)

Antes, `PaymentStep` pedía calle, ciudad y CP en inputs sueltos que nadie leía: el pedido a domicilio se creaba sin dirección. Ahora son campos controlados (calle, colonia, alcaldía o municipio, estado, CP, teléfono del repartidor, referencias) en `CheckoutClient`, validados al confirmar con `parseShippingAddress` de `@mucho-loco/customer-core/shipping` (mismas reglas que el backend; normaliza el teléfono a E.164) y mandados como `OrderDelivery`. `/api/orders` y `/api/checkout` rechazan con 400 un `delivery` mal formado antes de tocar el repositorio. El detalle del pedido muestra "SE ENVÍA A" con la dirección en vez del QR de retiro, y el estado 'ready' de un envío dice "PREPARANDO ENVÍO" (`orderStatusLabel` recibe `delivery`).

**Checkout solo Stripe + efectivo (2026-09-14)**: el paso de pago ofrece "TARJETA · OXXO · SPEI" (Stripe cobra en su página; ya no hay campos de tarjeta propios en nuestro sitio) y "efectivo" solo al recoger. Transferencia, Mercado Pago y PayPal se quitaron: creaban el pedido como pagado sin cobrar nada. `/api/orders` solo acepta `cash` (400 con cualquier otro método); todo lo demás va por `/api/checkout`. En el panel, un envío muestra "EN CAMINO" y la guía de rastreo cuando bodega lo manda (`owner-panel`, `/shipments`).

## Patrón: contenido de landing vía store (announcements, membership tiers, social)

`Memberships`, `Contact` y `AnnouncementsBoard` no reciben su data por props: la leen de un store de Zustand (`lib/stores/announcements.store.ts`, `membershipTiers.store.ts`, `socialLinks.store.ts`, `socialFeed.store.ts`), todos construidos con el factory `lib/stores/createAsyncResource.ts` (`{ data, loading, error, hydrate, fetch }`). El Server Component de home (`app/[locale]/page.tsx`) sigue precargando estos datos vía repository — igual que branches/products — y `MuchoLoco.tsx` los recibe como props y los usa solo para llamar `hydrate()` una vez al montar (así no hay flash de loader en la primera carga). `loading`/`fetch()` quedan disponibles para cuando el componente sí necesita mostrar el loader — `AnnouncementsBoard` re-hace `fetch()` cada vez que se abre, y el botón "EN VIVO VÍA API" del feed de `Contact` lo dispara manualmente. Nuevo contenido de landing sin repository propio (nada de arrays sueltos en el componente) debería seguir este mismo patrón.

## Swap de datasource: mock ↔ backend NestJS (2026-09-12)

Los 8 dominios de `lib/repositories/` pueden leerse del backend real (`apps/backend`) en vez de los mocks. **El default sigue siendo mock** — sin variables de entorno nuevas, este app arranca sin Postgres ni NestJS, igual que antes.

```bash
# .env.local (o inline)
NEXT_PUBLIC_DATA_SOURCE=http          # cualquier otro valor / ausente = mock
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- **Dónde se decide**: una sola línea por repositorio (`isHttpDatasourceEnabled() ? new XHttpDatasource(publicApi | accountApi) : new XMockDatasource()`). Ni componentes, ni stores, ni páginas saben cuál está activo.
- **Los datasources HTTP viven en `@mucho-loco/customer-core/http`** (desde 2026-09-12, compartidos con mobile-app) sobre `@mucho-loco/api-client` — el `client.ts` propio de este app se borró. Cada datasource declara ruta, `auth` y `maxAgeSeconds`; aquí solo queda la política de Next, en `lib/datasources/http/`:
  - `client.ts` — `publicApi` (sin token) y `nextCachePolicy`: el `maxAgeSeconds` de catálogo/landing se vuelve `next.revalidate`, lo que no declara edad (cuenta, escrituras) va `no-store`.
  - `account-client.ts` — `accountApi`, con el token de la cookie. **Solo servidor.**
  - Dos clientes y no uno, a propósito: los repositorios de la landing también corren en el navegador (stores), y un cliente que sepa leer la cookie arrastraría `next/headers` al bundle del cliente.
  - Timeout, 404 → `null` (el mock devuelve `null`, NestJS tira `NotFoundException`) y `ApiRequestError` los pone api-client; `client.ts` re-exporta la clase para `order-errors.ts`.
- **Token**: los dominios de cuenta (`user`, `community`, `performance`, `payment`) usan `accountApi`, cuyo `getToken` lee la cookie httpOnly `ml_session` con `cookieSessionToken` (`session-token.ts`, importa `next/headers` de forma dinámica). Por eso solo se pueden llamar desde el servidor — que es donde ya se llamaban (`app/[locale]/(account)/*/page.tsx` y `app/api/*`).
- **Ambos datasources implementan la misma interfaz** (`implements IXRepository` en mock y HTTP): si uno se desvía del contrato, no compila.

### Tres cambios de contrato que salieron del swap

El swap no fue solo cableado — expuso tres lugares donde el contrato mock no era implementable por un backend real:

1. **`createOrder` ya no recibe `total` ni `OrderItem[]`**, sino `NewOrderLine[]` (`{ productId, qty }`) + `lang`. El mock recibía nombre, sabor, imagen y total ya resueltos por el cliente — un cliente malicioso podía comprar a $1. Ahora el precio lo calcula quien implementa el contrato (el mock desde `PRODUCTS`, el backend desde la tabla `Product`), y `lang` dice en qué idioma congelar el recibo. El mock también imita las dos reglas de negocio del backend: efectivo exige `pickup`, y un `productId` fuera del catálogo se rechaza (`OrderValidationError`).
2. **`createPost`/`addComment` de community ya no reciben `authorName`/`authorBranch`.** El autor lo deriva el datasource de la identidad del socio (el mock de su registro, el backend del ID token). Antes el caller lo pasaba, o sea que se podía firmar un post con el nombre de otra persona.
3. **`HOME_SHIPPING_FEE`** (99) dejó de estar hardcodeado en 4 lugares y vive en `lib/pricing.ts`. El backend tiene su propia copia y **él es la autoridad** — el frontend solo la usa para previsualizar el total antes de mandar el pedido.

### Fechas: ISO de punta a punta (2026-09-12)

Se cerró el último hueco. `Visit` dejó de viajar como texto pre-armado (`day: '18'`, `month: 'JUN'`, `duration: '1h 24m'`) y ahora lleva `visitedAt` en ISO y `durationMinutes` como número; `AccessPane` formatea con `lib/dates.ts` (`formatDayOfMonth`, `formatMonthShort`, `formatDuration`), todos con `timeZone: 'UTC'` fijado.

Importa por dos razones, no una: con texto pre-armado la lista **no podía cambiar de idioma**, y era el backend quien tenía que saber los nombres de los meses en español — 24 líneas de formato que ya se borraron de `users.service.ts`.

Lo único que sigue siendo texto de display es `UserProfile.birthdate`, y a propósito: es un dato que el socio escribe, no una marca de tiempo que el sistema genere.

### Diferencia conocida (no es bug)

`AnnouncementsBoard` cambia de orden: el mock devuelve los avisos en el orden escrito a mano de `lib/data.ts`, el backend los ordena por fecha ascendente. El contenido es idéntico (el test de integración lo compara campo por campo). Si el orden del tablero importa, la solución es una columna de prioridad en el backend, no reproducir un orden arbitrario.

### Testing del swap

- **Unit** (`pnpm test`, sin red): el cliente genérico se prueba en `packages/api-client` (URL, query, token, 404→null, timeout sin `AbortSignal.timeout`, errores) y cada ruta en `packages/customer-core/src/http/http.test.ts` (método → ruta, token sí/no, `maxAgeSeconds`, y las regresiones de seguridad: el email del caller nunca viaja en la URL ni en el body, y el body de un pedido nunca lleva `total`). Aquí queda `lib/datasources/http/client.test.ts`: solo la política de este app (revalidate/no-store, lo público nunca lee la cookie, la cuenta sí).
- **Integración** (`pnpm test:integration`, contra el backend REAL en `:3001` y su Postgres — no corre en CI): `tests/integration/`. Compara la salida del datasource HTTP contra la del mock **campo por campo** para los 5 dominios públicos; si el seed de `apps/backend` se desincroniza de `lib/data.ts`, truena aquí. Para los dominios de cuenta verifica que el guard responde 401 y que ninguna ruta da 404 — la respuesta autenticada no se puede probar desde aquí porque no hay User Pool vivo (infra destruida, ver CLAUDE.md raíz); eso lo cubre `test/app.e2e-spec.ts` de `apps/backend`, que sobreescribe `CognitoVerifierService`.

Levantar el backend antes: `pnpm --filter @mucho-loco/backend start:dev`.

## Próximo hito: backend NestJS

Auth ya es real (Cognito) y el swap de datasource ya existe (ver la sección anterior). Lo que falta para correr 100% contra el backend:
1. Recrear la infra de AWS (`terraform apply`) para tener un User Pool vivo y poder ejercer los dominios de cuenta en HTTP.
2. Poner `NEXT_PUBLIC_DATA_SOURCE=http` como default cuando el backend esté desplegado de verdad (hoy el default es mock a propósito).

El middleware y el flujo de rutas NO cambian.
