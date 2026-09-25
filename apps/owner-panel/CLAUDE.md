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

## Facturas (CFDI) — `/invoicing` (2026-09-24)

Spec en `specs/004-owner-cfdi-panel/`. Los CFDI emitidos (un solo RFC para las 15 sucursales), sobre los endpoints de dueño del módulo `invoicing` del backend.

- **Mes** (`<input type="month">`, default el mes actual de CDMX, `lib/currentMonth.ts`): `GET /invoicing/cfdis?month=YYYY-MM` trae TODAS las del mes — sin mes el backend corta en 200, y eso escondería facturas al contador.
- **Buscar** por folio, RFC o nombre (así se encuentra la factura que un socio reporta por WhatsApp desde customer-app/mobile-app). **PDF/XML** por `api.getFile` + Blob.
- **Cancelar** solo vigentes, con motivo 02 o 03 explicado; errores tipados en `invoicing.errors.ts` (`CancellationRejectedError` con el motivo del SAT tal cual, `CfdiAlreadyCanceledError` → recarga, `InvoicingUnavailableError`). Cancelada una factura de socio, su cobro vuelve a poder facturarse (lo resuelve el backend).
- **Resumen** de recibos por estado, con los fallidos resaltados.
- **Exportar CSV** del mes (`lib/cfdiCsv.ts`): UTF-8 con BOM para Excel en español, comillas escapadas, fecha local de CDMX, total con 2 decimales.
- Mock: `SAT_REJECTS_CANCEL_UUID` simula un rechazo del SAT. La carga va dentro del efecto con `setState` solo en el callback de la promesa (el lint prohíbe `setState` síncrono en efectos).
- **Sin verificar en navegador** (iniciar sesión necesita User Pool vivo) y **sin probar contra Facturapi**. Verificado: unit (HTTP, mock, CSV, mes), `tsc -b`, lint, build, integración de rutas.

## Swap de datasource: mock ↔ backend NestJS (2026-09-12)

Los **4 repositorios están migrados** (`stats`, `inventoryTransfer`, `expenses`, `payroll`). Igual que en los otros dos apps, el default sigue siendo mock: sin configurar nada esto arranca sin Postgres ni backend.

```bash
# .env.local (o inline)
VITE_DATA_SOURCE=http          # cualquier otro valor / ausente = mock
VITE_API_URL=http://localhost:3001
```

`src/lib/datasources/http/client.ts` crea un cliente de `@mucho-loco/api-client` (compartido con `branch-app`) con la política de este app: token del store de auth y `?lang=` en toda request, porque el inventario global aplana nombres de producto.

### Lo que cambia de verdad al prender el flag

1. **`payroll.getAttendance()` deja de leer un dato semilla.** `ATTENDANCE_SUMMARIES` del mock era una lista escrita a mano; contra el backend, `daysWorked` son los turnos que `branch-app` fichó DE VERDAD. Ese era el pendiente explícito de la Fase 3 en el CLAUDE.md raíz, y es el motivo de que los dos apps compartan base.
2. **El cálculo de nómina deja de correr en el navegador.** `runPayroll` ya no calcula: pide al backend que emita los recibos, y el backend los **guarda** con nombre, sucursal, puesto y sueldo congelados — un recibo es un documento histórico, no algo que se recalcule al abrir la pantalla. `lib/payroll.ts` sigue vivo porque lo usa el mock; en modo HTTP no se ejecuta y se puede borrar el día que el mock deje de hacer falta.
3. **Los números de `BRANCH_STATS` se achican.** El mock devolvía cuatro filas a mano con `revenue: 186400`; el backend los deriva de transacciones reales. Contra una base recién sembrada eso da importes chicos — es el precio de que sean ciertos.
4. **Una transferencia deja de poder quedarse a medias.** El mock mutaba dos arreglos; el backend descuenta del origen, suma al destino y registra el movimiento en una transacción de base de datos.

### Errores tipados

`inventoryTransfer.errors.ts` y `payroll.errors.ts` siempre pidieron que un datasource real rechace con los mismos tipos. El backend manda un código de máquina en el cuerpo de cada 4xx (`apps/backend/src/common/error-codes.ts`) y el datasource lo traduce:

| Código del backend | Error del contrato |
|---|---|
| `SAME_BRANCH_TRANSFER` | `SameBranchError` |
| `INSUFFICIENT_STOCK` | `InsufficientStockError` (con `productName`) |
| `BRANCH_DOES_NOT_STOCK_PRODUCT` | `InsufficientStockError` — para HQ es lo mismo: no hay de dónde sacarlo |
| `PERIOD_NOT_FOUND` / `PERIOD_ALREADY_CLOSED` | `PeriodNotFoundError` / `PeriodAlreadyClosedError` |

Cualquier otro fallo pasa tal cual: un 500 no es un error de negocio y disfrazarlo de "sin stock" sería mentir.

### Fechas

Este app ya estaba bien: todas las fechas viajaban en ISO y se formatean al pintar con `lib/dates.ts`. El único ajuste fue que `expenses.mock.create()` devolvía un datetime completo mientras el backend manda fecha sola — con el datetime, la lista se ordenaba distinto según el modo.

### Testing

- **Unit** (`pnpm test`, sin red): `hq.http.test.ts` — cada método a su ruta, el token, `?lang=`, `branchId: null` viajando explícito en un gasto corporativo, y cada traducción de error (más las que no se traducen).
- **Integración** (`pnpm test:integration`, contra el backend real en `:3001`, fuera de CI): las 12 llamadas verifican que la ruta existe y que el guard la protege. La respuesta autenticada campo por campo la cubre `test/branch-ops.e2e-spec.ts` del backend.

### Verificado en navegador real (2026-09-12) ✅

Con el User Pool levantado un momento, Rodrigo (`owner`) y Playwright:

- **Resumen**: `INGRESOS TOTALES $2,080` y `CLIENTES ACTIVOS 1`, derivados de transacciones reales — el pedido que mostrador entregó ese mismo día. Las 15 sucursales listadas, no cuatro.
- **Nómina**: y aquí está el cruce completo. Luis fichó entrada y salida en `branch-app`; el panel mostró `Luis Ángel Ortega · ROMA SUR · Mostrador · 1/15`, y al correr la quincena emitió **$500 bruto, $0 ISR, $13 IMSS, $487 neto**, guardado en `payslips`. Dos apps distintas, dos usuarios distintos, una base.
- **Transferencias**: movió 5 Shaker de Roma Sur a Roma Norte → 120→115 y 80→85 en Postgres, con el movimiento en el historial y las otras sucursales sin tocar.
- **Gastos** y **Reportes ejecutivos**: cargaron con el dato sembrado.

Cero errores de consola.

**Un bug de CORS salió de aquí**: el backend solo permitía `localhost:5173`, y los dos apps de Vite piden ese mismo puerto, así que el segundo cae en `5174` y el navegador le bloqueaba TODO. El default del backend ahora incluye ambos.

## Envíos a domicilio — bodega central (`/shipments`, 2026-09-14)

Los pedidos a domicilio se guardaban con dirección pero nadie del staff los veía. Ahora la bodega (que opera HQ, por eso vive aquí) tiene su pantalla: tres secciones — **por enviar**, **en camino** y **entregados** — con socio, productos, total, dirección completa, teléfono y referencias. "Marcar enviado" acepta una guía opcional; "Marcar entregado" solo aparece en lo que ya salió. Solo se listan pedidos cobrados (el backend no manda los `pending_payment`).

Mismo patrón que transferencias: `shipments.repository.ts` / `.errors.ts` / `datasources/{mock,http}/shipments.*` / `stores/shipments.store.ts`, con `SHIPMENTS` en `lib/data.ts` para el mock. Nace con los dos datasources — ya son **5 repositorios** detrás de `VITE_DATA_SOURCE=http`. `ShipmentStateError` (con `reason`) es el error tipado del contrato: la pantalla solo ofrece la acción válida, pero con dos pestañas la lista puede estar vieja; el error vuelve a pedir la lista. El HTTP lo traduce de `ORDER_ALREADY_SHIPPED`/`ORDER_NOT_SHIPPED`/`ORDER_ALREADY_DELIVERED`/`ORDER_NOT_PAID`. Tests en `shipments.repository.test.ts` y `hq.http.test.ts`.

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
