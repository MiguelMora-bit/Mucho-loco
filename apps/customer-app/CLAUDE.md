# CLAUDE.md — apps/customer-app

Visión de negocio completa y estructura del monorepo: ver [`CLAUDE.md`](../../CLAUDE.md) en la raíz.

## Qué es este app

Tienda y app de membresías para "Mucho Loco Gym". Next.js 14 con App Router y TypeScript strict mode. El diseño original fue un prototipo HTML estático + React vía Babel; este repo es la migración idiomática a Next.js.

El backend de dominio (NestJS + RDS Postgres, ver CLAUDE.md raíz) se construirá después, probablemente como `apps/backend` aparte — todos los datos de negocio (productos, pedidos, membresías) siguen siendo mock. **Auth es la excepción**: desde 2026-09-09 es real contra Cognito (ver "Auth flow" abajo), adelantado porque no depende del contrato de API del resto del backend.

## Arquitectura

- **App Router** — todo en `app/`. No usar Pages Router.
- **'use client'** — solo en componentes con hooks/browser APIs. El componente principal `MuchoLoco.tsx` es `'use client'` porque usa `useState`, `useEffect`, canvas y localStorage.
- **Server Components** — las páginas de rutas son Server Components por defecto. Solo marcar como cliente cuando sea necesario.
- **i18n** — `next-intl`, rutas bajo `app/[locale]/`. Config en `i18n/routing.ts` y `i18n/request.ts`, mensajes en `messages/es.json` y `messages/en.json`.
- **Middleware** — `middleware.ts` en la raíz del app protege `/dashboard`, `/performance`, `/checkout` verificando la cookie `ml_session` (constantes en `lib/auth.ts`), y corre el middleware de `next-intl` para el locale.
- **Route Handlers** — `app/api/auth/{register,confirm,resend-code,login,logout}/route.ts` hablan con Cognito real (`lib/cognito.ts`). El browser nunca llama a AWS directo, solo a estas rutas.
- **Capas en `lib/`** — `datasources/mock/` (datos crudos), `repositories/` (acceso a datos), `stores/` (zustand: `auth.store.ts`, `cart.store.ts`), `hooks/` (`useT.ts` para traducciones).

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

- **Vitest** (`pnpm test` / `pnpm test:watch`) — unit tests de `lib/repositories/*.ts` (contrato de datos que el backend real va a tener que cumplir en Fase 2+) y de lógica pura extraída a `lib/` (`pricing.ts`, `i18n-href.ts`, `cognito-errors.ts`). No hay tests de componentes React todavía — se agregan cuando el UI deje de estar en movimiento.
- **Playwright** (`pnpm test:e2e`) — E2E de los flujos críticos en `tests/e2e/`: navegación (incluye regresión del bug del splash), auth + redirects de rutas protegidas (incluye una cookie `ml_session` fabricada a mano, rechazada tanto en `/dashboard` como en `POST /api/orders` — regresión de la auditoría de seguridad 2026-09-10), y shop → checkout → el pedido aparece en el dashboard. `playwright.config.ts` levanta el dev server solo si no hay uno corriendo ya, y fija `locale: 'es-MX'` porque el Accept-Language default de Chromium (en-US) hace que next-intl negocie inglés y rompa los asserts en español.
- Al agregar una página/feature nueva con lógica no trivial: si es lógica pura (cálculo, formateo, contrato de repository), Vitest; si es un flujo de usuario (click, navegación, formulario), un spec de Playwright.

## Pendiente / conocido

- `README.md` de este app menciona "CSS puro (sin Tailwind)" — desactualizado, el proyecto ya usa Tailwind v3. Pendiente de actualizar.
- **Decidido (2026-08-30): no hay formulario de contacto.** WhatsApp gana para este mercado — más natural que un form y ya es el tono de marca. El link `wa.me` en `Contact` (componente `MuchoLoco.tsx`) ya es funcional. Las claves `contact.name/email/branch/message/send` en `messages/*.json` quedan sin usar; no se borran todavía por si más adelante se justifica un form real con lead-capture. Notificaciones automáticas (avisos de vencimiento, pedido listo) van por WhatsApp Business Platform cuando exista backend — ver `CLAUDE.md` root.
- Rutas en inglés (`/account`, `/dashboard`, `/performance`, `/product/[id]`, `/checkout`) por preferencia explícita del usuario (2026-08-30) — el copy/contenido del sitio se queda en español.
- **Resuelto (2026-08-30):** checkout ya crea un pedido real vía `POST /api/orders` (server-side) que `userRepository.getOrders()` refleja — por eso un pedido nuevo SÍ aparece en el dashboard. `product/[id]` y `performance` siguen sin persistir nada (no hay acción de usuario ahí que debiera hacerlo).
- **Resuelto (2026-09-02):** `next-intl` antes solo cubría landing + product — Account/Dashboard/Checkout/Performance estaban 100% hardcodeados en español sin pasar por `useT()`. Ya están completos, siguiendo el mismo patrón (`useT()` una vez en la raíz del subtree, `t` como prop hacia abajo). `Product.name`/`.flav` y `FeedPost.cap` pasaron de `string` a `LocalizedString` (mismo patrón que `Announcement`/`MembershipTier`) para que el catálogo también cambie de idioma; `OrderItem.name`/`.flav` se quedan `string` a propósito (un pedido es un recibo congelado en el idioma de compra, no se retraduce). Fechas (`Order.date`, `PersonalRecord.date`, `Workout.date`) pasaron de string pre-formateado en español a ISO + `lib/dates.ts` (`Intl.DateTimeFormat`) para que sí cambien con el locale. Pendiente, fuera de este alcance: `Visit.day`/`.month` y `MOCK_PROFILE.birthdate` tienen el mismo defecto latente pero no se tocaron (los datos semilla actuales no lo evidencian).

## Patrón: página server component + client component

`dashboard` (`DashboardClient`), `product/[id]` (`ProductClient`) y `performance` (`PerformanceClient`) siguen el mismo patrón: el `page.tsx` es un Server Component async que llama al repository correspondiente y pasa los datos como props; el componente en `components/` es `'use client'` y solo maneja estado de interacción (tabs, cantidad, modales). Nuevas páginas con datos + interactividad deberían seguir esta misma división — así el swap de mock a API real (Fase 5 de la metodología) solo toca el `page.tsx`, nunca el componente cliente.

## Patrón: contenido de landing vía store (announcements, membership tiers, social)

`Memberships`, `Contact` y `AnnouncementsBoard` no reciben su data por props: la leen de un store de Zustand (`lib/stores/announcements.store.ts`, `membershipTiers.store.ts`, `socialLinks.store.ts`, `socialFeed.store.ts`), todos construidos con el factory `lib/stores/createAsyncResource.ts` (`{ data, loading, error, hydrate, fetch }`). El Server Component de home (`app/[locale]/page.tsx`) sigue precargando estos datos vía repository — igual que branches/products — y `MuchoLoco.tsx` los recibe como props y los usa solo para llamar `hydrate()` una vez al montar (así no hay flash de loader en la primera carga). `loading`/`fetch()` quedan disponibles para cuando el componente sí necesita mostrar el loader — `AnnouncementsBoard` re-hace `fetch()` cada vez que se abre, y el botón "EN VIVO VÍA API" del feed de `Contact` lo dispara manualmente. Nuevo contenido de landing sin repository propio (nada de arrays sueltos en el componente) debería seguir este mismo patrón.

## Próximo hito: backend NestJS

Auth ya es real (Cognito, ver "Auth flow" arriba). Cuando exista `apps/backend`, los cambios serán en:
1. `lib/repositories/*.ts` → reemplazar datasources mock con fetches a la API real (autenticados con el ID token de `ml_session`).
2. Las páginas protegidas → pasar de datos mock (`MOCK_PROFILE`, etc.) a datos reales del usuario logueado.

El middleware y el flujo de rutas NO cambian.
