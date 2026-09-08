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

`BRANCH_INVENTORY: BranchInventoryLevel[]` (`lib/data.ts`) es la única fuente de verdad del stock — vive por sucursal, reutilizando el mismo tipo de dominio que ya usa `branch-app`. `statsRepository.getGlobalInventory()` sólo suma `qty` por `productId` sobre ese arreglo en cada llamada (nunca guarda un total aparte), así que una transferencia entre sucursales jamás puede dejar el total del dashboard desincronizado.

Transferencias (`inventoryTransfer.repository.ts` / `.mock.ts` / `.errors.ts`) es su propio dominio, no una tercera vista del mismo datasource de `stats.mock.ts` — a diferencia de branch stats/inventario (solo lectura), transferencias muta `BRANCH_INVENTORY` (decrementa origen, incrementa o abre nivel en destino) y valida (`SameBranchError`, `InsufficientStockError`), mismo patrón que `counterSale.mock.ts` de `branch-app`. Dos stores (`branchInventory.store.ts`, `inventoryTransfers.store.ts`); tras `create()` la página vuelve a pedir ambos (`fetch()`), nunca confía en la copia previa — mismo patrón que el resto del monorepo.

## Comandos

```bash
pnpm --filter owner-panel dev
pnpm --filter owner-panel build
pnpm --filter owner-panel test
```

## Estado

- ✅ Fase 1: resumen con ingresos/clientes activos por sucursal + inventario global consolidado, ambos de solo lectura.
- ✅ Fase 2 completa (para owner-panel — branch-app todavía debe corte de caja/roles, ver su propio `CLAUDE.md`):
  - Gastos (`/expenses`): registro y listado de gastos, por sucursal (`branchId: number`) o corporativos (`branchId: null`, ej. marketing nacional o nómina de oficina) — 6 categorías (renta, servicios, mantenimiento, insumos, marketing, otro). El selector de sucursal del formulario reusa `useBranchStatsStore()` (mismo store que el dashboard) en vez de importar `data.ts` directo, para no saltarse la capa de repository. `Expense.date` es ISO + `lib/dates.ts` (`Intl.DateTimeFormat`) para que la fecha sí cambie con el idioma, mismo patrón que se usó para arreglar fechas en customer-app.
  - Transferencias de inventario (`/transfers`): mueve stock entre sucursales — formulario (producto/sucursal origen/sucursal destino/cantidad) + tabla de stock actual por sucursal + historial. Valida sucursal origen ≠ destino y stock suficiente en origen antes de mutar; si la sucursal destino no tenía ese producto, abre un nivel nuevo en vez de exigir que todas las sucursales carguen todo el catálogo.
- ✅ Fase 3 (parcial), nómina (`/payroll`): empleados, periodos quincenales (`open`/`closed`), asistencia pre-cargada (la captura real llega con la Fase 2 de branch-app — roles/login de staff — sin cambiar este cálculo) y recibos (bruto, ISR, IMSS, neto) vía `lib/payroll.ts` — **ISR/IMSS son una aproximación simplificada e ilustrativa para la demo, NO las tablas reales del SAT/IMSS**. "Correr nómina" solo aplica a la quincena `open`; al correrla queda `closed` y de solo lectura, sin re-cálculo.
- ⏳ Pendiente Fase 3: reportes ejecutivos avanzados.
