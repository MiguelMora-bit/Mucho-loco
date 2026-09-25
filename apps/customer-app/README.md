# Mucho Loco Gym — tienda y app del socio (web)

La web del socio de Mucho Loco Gym: landing con tienda, sucursales y membresías, y el panel del socio (membresía y QR de acceso, pedidos, comunidad, rendimiento y facturación). Es uno de los apps del monorepo; el detalle de arquitectura y decisiones está en [`CLAUDE.md`](./CLAUDE.md) y, para todo el proyecto, en el [`CLAUDE.md` raíz](../../CLAUDE.md).

## Stack

| Tecnología | Uso |
|---|---|
| Next.js 15 (App Router) + TypeScript | Framework (Server Components + Route Handlers) |
| React 19 | UI |
| Tailwind CSS 3 | Estilos (paleta `ml.*`, tokens en `app/globals.css`) |
| next-intl | Español / inglés; los textos viven en `@mucho-loco/customer-core/messages` |
| Amazon Cognito | Login con correo o Google/Facebook (cookie httpOnly) |
| `@mucho-loco/customer-core` | Contrato, mocks, datasources HTTP y reglas compartidas con la app móvil |

## Rutas

Todas bajo `/[locale]` (`/es`, `/en`).

| Ruta | Acceso | |
|---|---|---|
| `/` | Público | Landing: tienda, sucursales, membresías, avisos, contacto |
| `/product/[id]` | Público | Detalle de producto |
| `/account` | Público | Login y registro |
| `/checkout` | Sesión | Compra (Stripe, o efectivo al recoger en sucursal) |
| `/dashboard` | Sesión | Panel del socio |
| `/membership` | Sesión | Contratar o renovar la membresía |
| `/performance` | Sesión | Resumen, entrenamientos y heatmap de asistencia |
| `/invoicing` | Sesión | Datos fiscales y facturas (CFDI) |

## Datos: mock o backend

Por defecto todo corre contra mocks (`@mucho-loco/customer-core/mock`). Con `NEXT_PUBLIC_DATA_SOURCE=http` y `NEXT_PUBLIC_API_URL` usa el backend NestJS de `apps/backend` — ver "Swap de datasource" en [`CLAUDE.md`](./CLAUDE.md). Las variables van en `.env.local` (plantilla en `.env.example`).

## Comandos

```bash
pnpm --filter @mucho-loco/customer-app dev               # desarrollo (Turbopack)
pnpm --filter @mucho-loco/customer-app build
pnpm --filter @mucho-loco/customer-app test              # unit (Vitest)
pnpm --filter @mucho-loco/customer-app test:integration  # contra el backend local en :3001
pnpm --filter @mucho-loco/customer-app test:e2e          # Playwright (necesita un User Pool vivo)
```
