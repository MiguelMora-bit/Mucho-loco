# CLAUDE.md — apps/branch-app

Visión de negocio completa y estructura del monorepo: ver [`CLAUDE.md`](../../CLAUDE.md) en la raíz.

## Qué es este app

App de staff de sucursal: marcar pedidos "recoger en gym" como entregados, venta de mostrador (descuenta stock local), validar QR de acceso. Fase 2 agrega corte de caja y roles gerente/mostrador. Solo lo usa el staff en la sucursal — sin necesidad de SEO.

## Arquitectura — diferencias con customer-app

Este app es una **SPA con Vite + React 19**, no Next.js. Diferencias deliberadas respecto a `customer-app`:

- **Sin App Router, sin Server Components.** Routing 100% client-side con `react-router` (`BrowserRouter`/`Routes`/`Route`), un layout anidado (`AppShell` + `<Outlet/>`) desde el día uno aunque hoy solo haya una ruta — las siguientes (mostrador, QR) entran como rutas hermanas sin refactor.
- **Todo vive bajo `src/`** (no `app/`/`lib/`/`components/` en la raíz del paquete). El alias `@/*` apunta a `./src/*`.
- **Los stores hacen fetch-on-mount, no hydrate-first.** `customer-app` hidrata sus stores con datos que el Server Component ya trajo; aquí no hay servidor que pre-cargue nada, así que cada página llama `fetch()` en un `useEffect` al montar — el loader SÍ se ve en cada entrada a la página, no solo en refetch manual.
- **`src/lib/currentBranch.ts`** es un placeholder (`CURRENT_BRANCH_ID = 1`) para el contexto de sucursal del staff logueado. Cuando exista el backend/auth real, esto se deriva del JWT de Cognito — no antes.
- **Sin ESLint de Next** (`eslint-config-next`) — usa el flat config estándar de Vite+React (`typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`).
- **Tailwind** reusa la paleta de marca `ml.*` de `customer-app/tailwind.config.js` tal cual (consistencia visual entre los 3 apps), pero sin los tokens decorativos de landing page (fuentes display, glow shadows, escalas de fontSize/spacing) — un panel de staff denso en información no los necesita.
- **`lib/stores/createAsyncResource.ts`** está duplicado desde `customer-app` a propósito (ver la nota en el `CLAUDE.md` raíz sobre esa decisión) — no es un paquete compartido.
- **i18n con `react-i18next`** (no `next-intl`, que es específico de Next) — `lib/i18n.ts` inicializa `i18next` con los recursos de `lib/locales/{es,en}.json` (namespaced por ruta/feature, un objeto por componente). Sin enrutamiento por locale en la URL (app interno, sin necesidad de SEO) — el idioma es un toggle en `AppShell` que persiste en `localStorage['ml_lang']`, default `'es'`. Los errores lanzados por la capa mock/repository (`counterSale.errors.ts`) son tipados y en inglés (solo para logs) — la UI nunca muestra `e.message`, siempre construye el texto traducido a partir del tipo de error.

## Capas en `src/lib/`

Mismo patrón mock-first que `customer-app`: `datasources/mock/` (datos + delay simulado) → `repositories/` (`I*Repository` + instancia singleton, con el comentario "Swap this line..." marcando la costura hacia el backend real) → `stores/` (Zustand, un store por recurso vía `createAsyncResource`). Cada repository tiene su test de Vitest.

## Comandos

```bash
pnpm --filter branch-app dev
pnpm --filter branch-app build
pnpm --filter branch-app test
```

## Estado

- ✅ Fase 1, pedidos para recoger: lista con estado (`ready`/`delivered`) y acción "Marcar como entregado", leyendo `PickupOrder[]` mock filtrado por `CURRENT_BRANCH_ID`.
- ✅ Fase 1, venta de mostrador (`/counter`): grid de inventario local con stepper de cantidad (respeta el stock disponible), carrito con selector efectivo/tarjeta, `counterSaleRepository.createSale()` descuenta `BRANCH_INVENTORY` en el mock y regresa el total — igual que `pickupOrder.mock.ts`, `getInventory()` devuelve referencias vivas al arreglo mock, así que el patrón correcto tras una mutación es siempre volver a pedir los datos (`fetch()`), nunca confiar en una copia guardada de antes.
- ✅ Fase 1, validar QR (`/qr`): input tipo "lector de código de barras" (un QR real solo teclea el código + Enter) contra `qrAccessRepository.validate()`, panel de resultado con los 3 estados (`active`/`grace`/`expired`) más "no encontrado". Fase 1 de negocio ya completa.
- ✅ Fase 1, pagos de membresía en mostrador (`/counter`, pestaña "Membresías"): dos modos — "Nuevo socio" (dar de alta, genera QR nuevo tipo `ML-QR-####` y crea el `MemberAccessRecord`) y "Renovar membresía" (busca por QR, reactiva y extiende `expiresAt`) — mismo selector de plan/periodo y de método de pago (`cash`/`transfer`/`card`) para ambos. `membershipRepository` reusa la fórmula de precio (`calculateMembershipPrice`) y los multiplicadores de tier/periodo de `customer-app` duplicados a mano en `lib/pricing.ts`/`lib/membershipPlans.ts` — mantener en sync hasta que exista backend real. `PaymentMethod` (en `@mucho-loco/types`) ahora incluye `'transfer'` además de `'cash'`/`'card'`, compartido con el flujo de venta de productos.
- ⏳ Pendiente Fase 2: corte de caja, roles gerente/mostrador — esto último implica que branch-app necesita login/sesión de staff, que hoy no existe (`CURRENT_BRANCH_ID` sigue siendo el placeholder).
