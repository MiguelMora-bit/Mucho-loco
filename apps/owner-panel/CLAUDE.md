# CLAUDE.md — apps/owner-panel

Visión de negocio completa y estructura del monorepo: ver [`CLAUDE.md`](../../CLAUDE.md) en la raíz.

## Qué es este app

Panel HQ del dueño: estadísticas de ventas, clientes activos por sucursal, inventario global consolidado. Fase 1 es **solo lectura**. Fase 2 (completa) agrega transferencias de inventario y gastos. Fase 3 (completa para este app) agrega nómina y reportes ejecutivos avanzados — ver "Estado" abajo para lo que sigue pendiente fuera de este app (captura real de asistencia, ya resuelta del lado de `branch-app`, pendiente de conectarse cuando exista backend real). Solo lo usa el dueño — sin necesidad de SEO.

## Arquitectura — diferencias con customer-app

Este app es una **SPA con Vite + React 19**, no Next.js — mismas razones y mismas diferencias que documenta [`apps/branch-app/CLAUDE.md`](../branch-app/CLAUDE.md) (sin App Router/Server Components, todo bajo `src/`, stores fetch-on-mount, ESLint flat config de Vite, paleta `ml.*` sin los tokens decorativos de landing, `createAsyncResource.ts` duplicado a propósito). No lo repito aquí — léelo si vas a tocar la base de ambos apps.

Diferencia propia de este app: **no hay contexto de sucursal actual** (no existe un `currentBranch.ts` como en branch-app) — el panel del dueño ve las 15 sucursales a la vez, no una a la vez.

**i18n con `react-i18next`**, misma configuración que `branch-app` pero duplicada de forma independiente (`lib/i18n.ts` + `lib/locales/{es,en}.json` propios, sin paquete compartido) — ver `apps/branch-app/CLAUDE.md` para el razonamiento completo. Toggle de idioma en `AppShell`, persistido en `localStorage['ml_lang']`.

## Auth (real, Cognito — 2026-09-10)

SPA pura sin servidor propio, así que a diferencia de `customer-app` (donde Cognito se llama desde Route Handlers de Next.js) acá `InitiateAuthCommand`/`RefreshToken` se llaman **directo desde el browser** (`src/lib/cognito.ts`) — el App Client (`owner_panel` en `infra/modules/cognito`, separado del `web` de `customer-app`) es público y sin secreto, pensado para eso.

- Mismo User Pool compartido con `customer-app` (ver CLAUDE.md raíz) — cualquier cliente registrado puede autenticarse contra Cognito, así que el gate real es pertenecer al grupo `owner` (`cognito:groups` en el ID token). `LoginPage.tsx` rechaza con `NOT_OWNER` a cualquier login válido que no traiga ese grupo. Altas de dueño son `AdminCreateUser` + `AdminAddUserToGroup owner` (nunca self-signup, no hay pantalla de registro en este app).
- Sesión (`src/lib/stores/auth.store.ts`, zustand + `persist`) vive en `localStorage['ml_owner_session']` — sin servidor no hay cookie httpOnly posible.
- **`ProtectedRoute.tsx` re-verifica la sesión en cada acceso, nunca confía en el `user` cacheado (corregido 2026-09-10, auditoría de seguridad):** verifica firma+expiración del `idToken` contra el JWKS de Cognito (`lib/jwt.ts`, `jose`); si no es válido, intenta un `REFRESH_TOKEN_AUTH` real; si eso también falla, `clear()` + redirect a `/login`. En ambos caminos exitosos, re-deriva `user` (`lib/deriveOwnerUser.ts`, mismo chequeo de grupo `owner` que el login) desde el token verificado y lo vuelve a guardar — así que editar `ml_owner_session` a mano en devtools ya no sirve de nada, ni para fabricar una sesión desde cero ni para que una cuenta real se auto-asigne otro email/nombre. Antes solo comprobaba `if (!user)`. `useSessionRefresh` (montado en `AppShell`, ya con la sesión concedida) solo hace el keep-alive periódico cada 15 min — la verificación inicial la hace `ProtectedRoute`.
- `lib/jwt.ts` y `lib/cognito-errors.ts` están duplicados de `customer-app` a propósito (sin runtime compartido entre apps) — la única diferencia real es decodificar con `atob()` en vez de `Buffer` (browser puro, sin Node).
- Variables de entorno con prefijo `VITE_` (`VITE_COGNITO_REGION`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_USER_POOL_ID`) — se exponen al bundle del cliente a propósito, es un App Client público y el JWKS de Cognito también es público. Ver `.env.example`, valores desde `terraform output` en `infra/envs/dev`.

## Capas en `src/lib/`

Mismo patrón mock-first: `datasources/mock/stats.mock.ts` (un solo datasource cubre `getBranchStats()` y `getGlobalInventory()`, porque son dos vistas del mismo "dashboard de solo lectura", no dominios independientes) → `repositories/stats.repository.ts` → dos stores independientes (`branchStats.store.ts`, `globalInventory.store.ts`) — uno por sección de la página, no un mega-store combinado.

`BRANCH_INVENTORY: BranchInventoryLevel[]` (`lib/data.ts`) es la única fuente de verdad del stock — vive por sucursal, reutilizando el mismo tipo de dominio que ya usa `branch-app`. `statsRepository.getGlobalInventory()` sólo suma `qty` por `productId` sobre ese arreglo en cada llamada (nunca guarda un total aparte), así que una transferencia entre sucursales jamás puede dejar el total del dashboard desincronizado.

Transferencias (`inventoryTransfer.repository.ts` / `.mock.ts` / `.errors.ts`) es su propio dominio, no una tercera vista del mismo datasource de `stats.mock.ts` — a diferencia de branch stats/inventario (solo lectura), transferencias muta `BRANCH_INVENTORY` (decrementa origen, incrementa o abre nivel en destino) y valida (`SameBranchError`, `InsufficientStockError`), mismo patrón que `counterSale.mock.ts` de `branch-app`. Dos stores (`branchInventory.store.ts`, `inventoryTransfers.store.ts`); tras `create()` la página vuelve a pedir ambos (`fetch()`), nunca confía en la copia previa — mismo patrón que el resto del monorepo.

## Comandos

```bash
pnpm --filter owner-panel dev
pnpm --filter owner-panel build
pnpm --filter owner-panel test       # Vitest — repositorios + lib pura (payroll.ts, deriveOwnerUser.ts, cognito-errors.ts)
pnpm --filter owner-panel test:e2e   # Playwright (agregado 2026-09-10) — login real contra Cognito, incluida la sesión fabricada en localStorage
```

## Estado

- ✅ Fase 1: resumen con ingresos/clientes activos por sucursal + inventario global consolidado, ambos de solo lectura.
- ✅ Fase 2 completa (para owner-panel — branch-app también terminó su propia Fase 2 (corte de caja, roles, reportes locales), ver su `CLAUDE.md`):
  - Gastos (`/expenses`): registro y listado de gastos, por sucursal (`branchId: number`) o corporativos (`branchId: null`, ej. marketing nacional o nómina de oficina) — 6 categorías (renta, servicios, mantenimiento, insumos, marketing, otro). El selector de sucursal del formulario reusa `useBranchStatsStore()` (mismo store que el dashboard) en vez de importar `data.ts` directo, para no saltarse la capa de repository. `Expense.date` es ISO + `lib/dates.ts` (`Intl.DateTimeFormat`) para que la fecha sí cambie con el idioma, mismo patrón que se usó para arreglar fechas en customer-app.
  - Transferencias de inventario (`/transfers`): mueve stock entre sucursales — formulario (producto/sucursal origen/sucursal destino/cantidad) + tabla de stock actual por sucursal + historial. Valida sucursal origen ≠ destino y stock suficiente en origen antes de mutar; si la sucursal destino no tenía ese producto, abre un nivel nuevo en vez de exigir que todas las sucursales carguen todo el catálogo.
- ✅ Fase 3, nómina (`/payroll`): empleados, periodos quincenales (`open`/`closed`), asistencia pre-cargada (`AttendanceSummary` sembrado — branch-app ya tiene captura real de asistencia desde 2026-09-11, pero vive aislada en su propio mock; esto sigue sin cambiar hasta que ambos apps compartan backend real) y recibos (bruto, ISR, IMSS, neto) vía `lib/payroll.ts` — **ISR/IMSS son una aproximación simplificada e ilustrativa para la demo, NO las tablas reales del SAT/IMSS**. "Correr nómina" solo aplica a la quincena `open`; al correrla queda `closed` y de solo lectura, sin re-cálculo.
- ✅ Fase 3, reportes ejecutivos avanzados (`/reports`, 2026-09-11): cruza ingresos (`BranchStatsSummary`), gastos (`Expense`) y costo de nómina (`Payslip.grossPay`, no `netPay` — las deducciones también son costo para el negocio) en una P&L real por sucursal, algo que antes vivía repartido en 3 pantallas sin cruzarse. `calculateExecutiveReport()` (`lib/executiveReport.ts`) es pura, con su propio test, mismo patrón que `payroll.ts`; el store (`executiveReport.store.ts`) es el único que hace `Promise.all` sobre 3 repositories en vez de uno — no hizo falta ningún datasource/mock nuevo. También desglosa gastos por categoría a nivel compañía.
