# CLAUDE.md — apps/owner-panel

Visión de negocio completa y estructura del monorepo: ver [`CLAUDE.md`](../../CLAUDE.md) en la raíz.

## Qué es este app

Panel HQ del dueño: estadísticas de ventas, clientes activos por sucursal, inventario global consolidado. Fase 1 es **solo lectura** — sin corte de caja ni nómina todavía. Fase 2 agrega transferencias de inventario y gastos. Fase 3 agrega nómina y reportes ejecutivos avanzados. Solo lo usa el dueño — sin necesidad de SEO.

## Arquitectura — diferencias con customer-app

Este app es una **SPA con Vite + React 19**, no Next.js — mismas razones y mismas diferencias que documenta [`apps/branch-app/CLAUDE.md`](../branch-app/CLAUDE.md) (sin App Router/Server Components, todo bajo `src/`, stores fetch-on-mount, ESLint flat config de Vite, paleta `ml.*` sin los tokens decorativos de landing, `createAsyncResource.ts` duplicado a propósito). No lo repito aquí — léelo si vas a tocar la base de ambos apps.

Diferencia propia de este app: **no hay contexto de sucursal actual** (no existe un `currentBranch.ts` como en branch-app) — el panel del dueño ve las 15 sucursales a la vez, no una a la vez.

**i18n con `react-i18next`**, misma configuración que `branch-app` pero duplicada de forma independiente (`lib/i18n.ts` + `lib/locales/{es,en}.json` propios, sin paquete compartido) — ver `apps/branch-app/CLAUDE.md` para el razonamiento completo. Toggle de idioma en `AppShell`, persistido en `localStorage['ml_lang']`.

## Capas en `src/lib/`

Mismo patrón mock-first: `datasources/mock/stats.mock.ts` (un solo datasource cubre `getBranchStats()` y `getGlobalInventory()`, porque son dos vistas del mismo "dashboard de solo lectura", no dominios independientes) → `repositories/stats.repository.ts` → dos stores independientes (`branchStats.store.ts`, `globalInventory.store.ts`) — uno por sección de la página, no un mega-store combinado.

## Comandos

```bash
pnpm --filter owner-panel dev
pnpm --filter owner-panel build
pnpm --filter owner-panel test
```

## Estado

- ✅ Fase 1: resumen con ingresos/clientes activos por sucursal + inventario global consolidado, ambos de solo lectura.
- ✅ Fase 2 (parcial), gastos (`/expenses`): registro y listado de gastos, por sucursal (`branchId: number`) o corporativos (`branchId: null`, ej. marketing nacional o nómina de oficina) — 6 categorías (renta, servicios, mantenimiento, insumos, marketing, otro). El selector de sucursal del formulario reusa `useBranchStatsStore()` (mismo store que el dashboard) en vez de importar `data.ts` directo, para no saltarse la capa de repository. `Expense.date` es ISO + `lib/dates.ts` (`Intl.DateTimeFormat`) para que la fecha sí cambie con el idioma, mismo patrón que se usó para arreglar fechas en customer-app.
- ⏳ Pendiente Fase 2: transferencias de inventario.
- ⏳ Pendiente Fase 3: nómina, reportes ejecutivos avanzados.
