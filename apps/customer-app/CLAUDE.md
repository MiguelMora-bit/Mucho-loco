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
- **Middleware** — `middleware.ts` en la raíz del app protege `/panel`, `/rendimiento`, `/checkout` verificando la cookie `ml_session` (constantes en `lib/auth.ts`), y corre el middleware de `next-intl` para el locale.
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
Usuario sin sesión → /panel → middleware → /cuenta?next=/panel
                                                    ↓
                                         Login form submit
                                                    ↓
                                         POST /api/auth/login
                                                    ↓
                                         Cookie ml_session seteada
                                                    ↓
                                         router.push(next || '/panel')
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

## Pendiente / conocido

- `README.md` de este app menciona "CSS puro (sin Tailwind)" — desactualizado, el proyecto ya usa Tailwind v3. Pendiente de actualizar.
- **Decidido (2026-08-30): no hay formulario de contacto.** WhatsApp gana para este mercado — más natural que un form y ya es el tono de marca. El link `wa.me` en `Contact` (componente `MuchoLoco.tsx`) ya es funcional. Las claves `contact.name/email/branch/message/send` en `messages/*.json` quedan sin usar; no se borran todavía por si más adelante se justifica un form real con lead-capture. Notificaciones automáticas (avisos de vencimiento, pedido listo) van por WhatsApp Business Platform cuando exista backend — ver `CLAUDE.md` root.
- `producto/[id]` y `rendimiento` no crean pedidos/entrenamientos reales — el checkout no escribe en `userRepository`, así que un pedido nuevo no aparece en el panel. Aceptable para mock, pero si se quiere una demo 100% coherente falta cablear eso.

## Patrón: página server component + client component

`panel` (`PanelClient`), `producto/[id]` (`ProductoClient`) y `rendimiento` (`RendimientoClient`) siguen el mismo patrón: el `page.tsx` es un Server Component async que llama al repository correspondiente y pasa los datos como props; el componente en `components/` es `'use client'` y solo maneja estado de interacción (tabs, cantidad, modales). Nuevas páginas con datos + interactividad deberían seguir esta misma división — así el swap de mock a API real (Fase 5 de la metodología) solo toca el `page.tsx`, nunca el componente cliente.

## Próximo hito: backend AWS

Cuando se integre AWS (o el backend que se decida), los cambios serán en:
1. `app/api/auth/login/route.ts` → llamar a Cognito en vez de setear cookie directamente
2. `lib/repositories/*.ts` → reemplazar datasources mock con fetches a la API real
3. Las páginas protegidas → pasar de datos mock a datos reales del usuario

El middleware y el flujo de rutas NO cambian.
