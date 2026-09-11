# CLAUDE.md — apps/branch-app

Visión de negocio completa y estructura del monorepo: ver [`CLAUDE.md`](../../CLAUDE.md) en la raíz.

## Qué es este app

App de staff de sucursal: marcar pedidos "recoger en gym" como entregados, venta de mostrador (descuenta stock local), validar QR de acceso. Fase 2 agrega corte de caja y roles gerente/mostrador. Solo lo usa el staff en la sucursal — sin necesidad de SEO.

## Arquitectura — diferencias con customer-app

Este app es una **SPA con Vite + React 19**, no Next.js. Diferencias deliberadas respecto a `customer-app`:

- **Sin App Router, sin Server Components.** Routing 100% client-side con `react-router` (`BrowserRouter`/`Routes`/`Route`), un layout anidado (`AppShell` + `<Outlet/>`) desde el día uno aunque hoy solo haya una ruta — las siguientes (mostrador, QR) entran como rutas hermanas sin refactor.
- **Todo vive bajo `src/`** (no `app/`/`lib/`/`components/` en la raíz del paquete). El alias `@/*` apunta a `./src/*`.
- **Los stores hacen fetch-on-mount, no hydrate-first.** `customer-app` hidrata sus stores con datos que el Server Component ya trajo; aquí no hay servidor que pre-cargue nada, así que cada página llama `fetch()` en un `useEffect` al montar — el loader SÍ se ve en cada entrada a la página, no solo en refetch manual.
- **`src/lib/currentBranch.ts`** ya NO es placeholder (resuelto 2026-09-10) — `getCurrentBranchId()` lee la sucursal del staff logueado desde el store de auth, poblado en el login real. Ver "Auth" abajo.
- **Sin ESLint de Next** (`eslint-config-next`) — usa el flat config estándar de Vite+React (`typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`).
- **Tailwind** reusa la paleta de marca `ml.*` de `customer-app/tailwind.config.js` tal cual (consistencia visual entre los 3 apps), pero sin los tokens decorativos de landing page (fuentes display, glow shadows, escalas de fontSize/spacing) — un panel de staff denso en información no los necesita.
- **`lib/stores/createAsyncResource.ts`** está duplicado desde `customer-app` a propósito (ver la nota en el `CLAUDE.md` raíz sobre esa decisión) — no es un paquete compartido.
- **i18n con `react-i18next`** (no `next-intl`, que es específico de Next) — `lib/i18n.ts` inicializa `i18next` con los recursos de `lib/locales/{es,en}.json` (namespaced por ruta/feature, un objeto por componente). Sin enrutamiento por locale en la URL (app interno, sin necesidad de SEO) — el idioma es un toggle en `AppShell` que persiste en `localStorage['ml_lang']`, default `'es'`. Los errores lanzados por la capa mock/repository (`counterSale.errors.ts`) son tipados y en inglés (solo para logs) — la UI nunca muestra `e.message`, siempre construye el texto traducido a partir del tipo de error.

## Auth (real, Cognito — 2026-09-10)

Mismo patrón que `owner-panel` (SPA sin servidor propio → Cognito se llama directo desde el browser, `src/lib/cognito.ts`) — léelo primero si no lo conoces. App Client propio (`branch_app` en `infra/modules/cognito`), mismo User Pool compartido con `customer-app`/`owner-panel`.

- El gate real es pertenecer al grupo `staff` o `manager` (`cognito:groups` en el ID token) — `LoginPage.tsx` rechaza con `NOT_STAFF` cualquier login válido sin esos grupos (ej. una cuenta de cliente). El rol (`staff` = mostrador, `manager` = gerente) se deriva de cuál de los dos grupos trae, para cuando llegue Fase 2 (corte de caja, permisos diferenciados) — hoy solo se guarda y se muestra en el header, no hay todavía UI que restrinja nada por rol.
- **`src/lib/staffDirectory.ts`** — mapeo mock `email → { branchId, branchName }`. Cognito NO guarda la sucursal de cada empleado a propósito (se mantiene minimal, ver CLAUDE.md raíz) — eso es dato de negocio que hoy vive acá y que el backend real (tabla de empleados en Postgres) reemplazará. Un login válido con grupo staff/manager pero sin entrada en este directorio se rechaza con `NO_BRANCH_ASSIGNED`.
- Altas de staff/gerente son `AdminCreateUser` + `AdminAddUserToGroup` (nunca self-signup, no hay pantalla de registro en este app) — y hay que agregar la entrada correspondiente en `staffDirectory.ts` a mano.
- Sesión (`src/lib/stores/auth.store.ts`, zustand + `persist`) en `localStorage['ml_staff_session']`.
- **`ProtectedRoute.tsx` re-verifica la sesión en cada acceso, nunca confía en el `user` cacheado (corregido 2026-09-10, auditoría de seguridad):** verifica firma+expiración del `idToken` contra el JWKS de Cognito (`lib/jwt.ts`, `jose`); si no es válido, intenta un `REFRESH_TOKEN_AUTH` real; si eso también falla, `clear()` + redirect a `/login`. En ambos caminos exitosos, re-deriva `user` (rol Y sucursal, `lib/deriveStaffUser.ts` — misma lógica de grupo+`staffDirectory` que el login) desde el token verificado y lo vuelve a guardar — así que un staff real no puede auto-asignarse `role: 'manager'` editando `ml_staff_session` a mano en devtools, aunque su propio `idToken` siga siendo válido: el rol se recalcula del token, no del objeto cacheado. Antes solo comprobaba `if (!user)`. `useSessionRefresh` (montado en `AppShell`) solo hace el keep-alive periódico cada 15 min — la verificación inicial la hace `ProtectedRoute`.
- `lib/jwt.ts`/`lib/cognito-errors.ts` duplicados de `customer-app`/`owner-panel` a propósito (sin runtime compartido entre apps).
- Variables `VITE_COGNITO_REGION`/`VITE_COGNITO_CLIENT_ID`/`VITE_COGNITO_USER_POOL_ID` — ver `.env.example`, valores desde `terraform output` en `infra/envs/dev`.

## QR real: acceso y pedidos (2026-09-10)

Dos flujos, conectados de punta a punta con `customer-app` (mismos códigos/ids reales, no mocks paralelos desincronizados) y con lectura real por cámara además del input tipo lector físico:

- **`components/QrCameraScanner.tsx`** — cámara real vía [`qr-scanner`](https://github.com/nimiq/qr-scanner) (WASM/`BarcodeDetector`, corre en un worker). Reusado por ambas pantallas de abajo. Botón explícito "Activar cámara" (no arranca sola) para no pedir permiso de cámara sin que el staff lo pida. El input manual tipo "lector físico" (teclea + Enter) sigue existiendo en las dos pantallas como respaldo — hardware dedicado de mostrador no necesita cámara ni permisos del navegador.
- **`/qr` (acceso)**: `MEMBER_ACCESS_RECORDS` (`lib/data.ts`) usa LOS MISMOS `accessCode` que genera `customer-app` para sus usuarios de prueba (`ML-DIEGO-2026-ALLGYMS`, `ML-VALERIA-2026-CONDESA`) — el QR que un socio ve en su dashboard de verdad se puede escanear acá. `qrAccessRepository.validate(qrCode, branchId)` ahora regresa `{ outcome: 'not_found' | 'wrong_branch' | 'expired' | 'valid', record? }` en vez de `MemberAccessRecord | null` — implementa la regla pendiente en el CLAUDE.md raíz ("Membresía y alcance de acceso"): tier `single` fuera de `homeBranchId` se RECHAZA con `wrong_branch`, tier `all` pasa en cualquier sucursal. **Corregido 2026-09-11**: `status: 'expired'` ahora deniega con `outcome: 'expired'` (antes regresaba `'valid'` igual, y solo la etiqueta roja en `QrValidationPage` avisaba — el repository nunca bloqueaba de verdad). `expired` se evalúa antes que `wrong_branch`: una membresía vencida se rechaza en cualquier sucursal, no solo en la incorrecta. `grace` sigue siendo `'valid'` (acceso permitido, con aviso) — solo `expired` deniega, según la regla de periodo de gracia del CLAUDE.md raíz. `MemberAccessRecord` (en `@mucho-loco/types`) ahora carga `tierKey`/`homeBranchId`/`homeBranchName` — se setean también al dar de alta o renovar en `/counter` (`membershipRepository.signUpNewMember`/`renewMembership`, que ahora reciben también `branchName` vía `getCurrentBranchName()`).
- **Corregido 2026-09-10 (auditoría de seguridad)**: los QR nuevos que se mintan al dar de alta un socio en mostrador (`signUpNewMember`) ya NO son secuenciales (`ML-QR-0100`, `0101`, ... — solo 9900 combinaciones, enumerable en segundos). Ahora `generateQrCode()` usa `crypto.randomUUID()` para un sufijo hex de 12 caracteres, criptográficamente impredecible. Sigue sin resolverse el problema de fondo — `MEMBER_ACCESS_RECORDS` vive en el bundle JS de esta SPA, legible por cualquiera que abra devtools — eso requiere mover la validación a un backend real (`apps/backend`, todavía sin construir); no hay parche del lado cliente que lo arregle de verdad.
- **`/` (pedidos)**: nuevo panel de búsqueda por QR/folio arriba de la lista — encuentra el pedido por `order.id` entre los de la sucursal actual (los ids de `PICKUP_ORDERS` ya coincidían con los de `customer-app`, ej. `#ML-240619` de Diego) y ofrece "Marcar como entregado" ahí mismo, sin buscar en la lista de abajo. Estados: encontrado y listo, ya entregado, no encontrado.

## Capas en `src/lib/`

Mismo patrón mock-first que `customer-app`: `datasources/mock/` (datos + delay simulado) → `repositories/` (`I*Repository` + instancia singleton, con el comentario "Swap this line..." marcando la costura hacia el backend real) → `stores/` (Zustand, un store por recurso vía `createAsyncResource`). Cada repository tiene su test de Vitest.

## Comandos

```bash
pnpm --filter branch-app dev
pnpm --filter branch-app build
pnpm --filter branch-app test       # Vitest — repositorios + lib pura (pricing.ts, deriveStaffUser.ts, cognito-errors.ts)
pnpm --filter branch-app test:e2e   # Playwright (agregado 2026-09-10) — login real contra Cognito, auto-escalación de rol, sesión fabricada
```

## Estado

- ✅ Fase 1, pedidos para recoger: lista con estado (`ready`/`delivered`) y acción "Marcar como entregado", leyendo `PickupOrder[]` mock filtrado por `CURRENT_BRANCH_ID`.
- ✅ Fase 1, venta de mostrador (`/counter`): grid de inventario local con stepper de cantidad (respeta el stock disponible), carrito con selector efectivo/tarjeta, `counterSaleRepository.createSale()` descuenta `BRANCH_INVENTORY` en el mock y regresa el total — igual que `pickupOrder.mock.ts`, `getInventory()` devuelve referencias vivas al arreglo mock, así que el patrón correcto tras una mutación es siempre volver a pedir los datos (`fetch()`), nunca confiar en una copia guardada de antes.
- ✅ Fase 1, validar QR (`/qr`): cámara real + input tipo "lector de código de barras" contra `qrAccessRepository.validate()` — panel con `active`/`grace` (acceso permitido, con aviso en `grace`), `expired` (acceso denegado), "sucursal incorrecta" y "no encontrado". Fase 1 de negocio ya completa. Ver "QR real" abajo.
- ✅ Fase 1, pagos de membresía en mostrador (`/counter`, pestaña "Membresías"): dos modos — "Nuevo socio" (dar de alta, genera QR nuevo tipo `ML-QR-####` y crea el `MemberAccessRecord`) y "Renovar membresía" (busca por QR, reactiva y extiende `expiresAt`) — mismo selector de plan/periodo y de método de pago (`cash`/`transfer`/`card`) para ambos. `membershipRepository` reusa la fórmula de precio (`calculateMembershipPrice`) y los multiplicadores de tier/periodo de `customer-app` duplicados a mano en `lib/pricing.ts`/`lib/membershipPlans.ts` — mantener en sync hasta que exista backend real. `PaymentMethod` (en `@mucho-loco/types`) ahora incluye `'transfer'` además de `'cash'`/`'card'`, compartido con el flujo de venta de productos.
- ✅ Login real de staff (2026-09-10, ver "Auth" arriba) — precondición de Fase 2 ya resuelta.
- ⏳ Pendiente Fase 2: corte de caja y permisos diferenciados por rol (gerente vs. mostrador) en la UI — el rol ya viaja en la sesión, falta usarlo para restringir algo.
