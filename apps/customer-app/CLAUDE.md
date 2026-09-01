# CLAUDE.md — apps/customer-app

Visión de negocio completa y estructura del monorepo: ver [`CLAUDE.md`](../../CLAUDE.md) en la raíz.

## Qué es este app

Tienda y app de membresías para "Mucho Loco Gym". Next.js 14 con App Router y TypeScript strict mode. El diseño original fue un prototipo HTML estático + React vía Babel; este repo es la migración idiomática a Next.js.

El backend (AWS: Cognito, DynamoDB, Lambda) se construirá después, probablemente como `apps/backend` aparte. Por ahora todos los datos son mock y el auth usa una cookie `ml_session` simulada.

## Arquitectura

- **App Router** — todo en `app/`. No usar Pages Router.
- **'use client'** — solo en componentes con hooks/browser APIs. El componente principal `MuchoLoco.tsx` es `'use client'` porque usa `useState`, `useEffect`, canvas y localStorage.
- **Server Components** — las páginas de rutas son Server Components por defecto. Solo marcar como cliente cuando sea necesario.
- **i18n** — `next-intl`, rutas bajo `app/[locale]/`. Config en `i18n/routing.ts` y `i18n/request.ts`, mensajes en `messages/es.json` y `messages/en.json`.
- **Middleware** — `middleware.ts` en la raíz del app protege `/dashboard`, `/performance`, `/checkout` verificando la cookie `ml_session` (constantes en `lib/auth.ts`), y corre el middleware de `next-intl` para el locale.
- **Route Handlers** — `app/api/auth/login/route.ts` y `logout/route.ts` manejan la autenticación mock.
- **Capas en `lib/`** — `datasources/mock/` (datos crudos), `repositories/` (acceso a datos), `stores/` (zustand: `auth.store.ts`, `cart.store.ts`), `hooks/` (`useT.ts` para traducciones).

## Tipos compartidos

Los tipos de dominio (`Branch`, `Product`, `CartItem`, `UserProfile`, etc.) viven en el paquete de workspace `@mucho-loco/types` (`packages/types/src/index.ts`), no en este app. Importar siempre como `import type { X } from '@mucho-loco/types'`. Si se agrega un tipo nuevo que otro app del monorepo también necesitará (ej. `branch-app`, `backend`), agregarlo ahí — si es exclusivo de este app, se queda local.

## Estilos

`app/globals.css` = concatenación de `styles.css` + `sections.css` + `mobile.css` del diseño original, ahora reescrito con Tailwind v3 (`@layer components` al final del archivo para estilos de página). Variables CSS (`--red`, `--cream`, `--black`, `--border`, etc.) siguen usándose para algunos estilos inline.

## Fuentes

Cargadas con `next/font/google` en `layout.tsx`: `'Anton'`, `'Bebas Neue'`, `'Inter'`, `'JetBrains Mono'`, `'Permanent Marker'` — expuestas como variables `--font-*` en el `<html>`.

## Auth flow

```
Usuario sin sesión → /dashboard → middleware → /account?next=/dashboard
                                                    ↓
                                         Login form submit
                                                    ↓
                                         POST /api/auth/login
                                                    ↓
                                         Cookie ml_session seteada
                                                    ↓
                                         router.push(next || '/dashboard')
```

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

- **Vitest** (`pnpm test` / `pnpm test:watch`) — unit tests de `lib/repositories/*.ts` (contrato de datos que el backend real va a tener que cumplir en Fase 2+) y de lógica pura extraída a `lib/` (`pricing.ts`, `i18n-href.ts`). No hay tests de componentes React todavía — se agregan cuando el UI deje de estar en movimiento.
- **Playwright** (`pnpm test:e2e`) — E2E de los flujos críticos en `tests/e2e/`: navegación (incluye regresión del bug del splash), auth + redirects de rutas protegidas, y shop → checkout → el pedido aparece en el dashboard. `playwright.config.ts` levanta el dev server solo si no hay uno corriendo ya, y fija `locale: 'es-MX'` porque el Accept-Language default de Chromium (en-US) hace que next-intl negocie inglés y rompa los asserts en español.
- Al agregar una página/feature nueva con lógica no trivial: si es lógica pura (cálculo, formateo, contrato de repository), Vitest; si es un flujo de usuario (click, navegación, formulario), un spec de Playwright.

## Pendiente / conocido

- `README.md` de este app menciona "CSS puro (sin Tailwind)" — desactualizado, el proyecto ya usa Tailwind v3. Pendiente de actualizar.
- **Decidido (2026-08-30): no hay formulario de contacto.** WhatsApp gana para este mercado — más natural que un form y ya es el tono de marca. El link `wa.me` en `Contact` (componente `MuchoLoco.tsx`) ya es funcional. Las claves `contact.name/email/branch/message/send` en `messages/*.json` quedan sin usar; no se borran todavía por si más adelante se justifica un form real con lead-capture. Notificaciones automáticas (avisos de vencimiento, pedido listo) van por WhatsApp Business Platform cuando exista backend — ver `CLAUDE.md` root.
- Rutas en inglés (`/account`, `/dashboard`, `/performance`, `/product/[id]`, `/checkout`) por preferencia explícita del usuario (2026-08-30) — el copy/contenido del sitio se queda en español.
- **Resuelto (2026-08-30):** checkout ya crea un pedido real vía `POST /api/orders` (server-side) que `userRepository.getOrders()` refleja — por eso un pedido nuevo SÍ aparece en el dashboard. `product/[id]` y `performance` siguen sin persistir nada (no hay acción de usuario ahí que debiera hacerlo).

## Patrón: página server component + client component

`dashboard` (`DashboardClient`), `product/[id]` (`ProductClient`) y `performance` (`PerformanceClient`) siguen el mismo patrón: el `page.tsx` es un Server Component async que llama al repository correspondiente y pasa los datos como props; el componente en `components/` es `'use client'` y solo maneja estado de interacción (tabs, cantidad, modales). Nuevas páginas con datos + interactividad deberían seguir esta misma división — así el swap de mock a API real (Fase 5 de la metodología) solo toca el `page.tsx`, nunca el componente cliente.

## Patrón: contenido de landing vía store (announcements, membership tiers, social)

`Memberships`, `Contact` y `AvisosBoard` no reciben su data por props: la leen de un store de Zustand (`lib/stores/announcements.store.ts`, `membershipTiers.store.ts`, `socialLinks.store.ts`, `socialFeed.store.ts`), todos construidos con el factory `lib/stores/createAsyncResource.ts` (`{ data, loading, error, hydrate, fetch }`). El Server Component de home (`app/[locale]/page.tsx`) sigue precargando estos datos vía repository — igual que branches/products — y `MuchoLoco.tsx` los recibe como props y los usa solo para llamar `hydrate()` una vez al montar (así no hay flash de loader en la primera carga). `loading`/`fetch()` quedan disponibles para cuando el componente sí necesita mostrar el loader — `AvisosBoard` re-hace `fetch()` cada vez que se abre, y el botón "EN VIVO VÍA API" del feed de `Contact` lo dispara manualmente. Nuevo contenido de landing sin repository propio (nada de arrays sueltos en el componente) debería seguir este mismo patrón.

## Próximo hito: backend AWS

Cuando se integre AWS (o el backend que se decida), los cambios serán en:
1. `app/api/auth/login/route.ts` → llamar a Cognito en vez de setear cookie directamente
2. `lib/repositories/*.ts` → reemplazar datasources mock con fetches a la API real
3. Las páginas protegidas → pasar de datos mock a datos reales del usuario

El middleware y el flujo de rutas NO cambian.
