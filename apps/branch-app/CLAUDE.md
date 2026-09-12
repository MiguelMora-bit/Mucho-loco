# CLAUDE.md — apps/branch-app

Visión de negocio completa y estructura del monorepo: ver [`CLAUDE.md`](../../CLAUDE.md) en la raíz.

## Qué es este app

App de staff de sucursal: marcar pedidos "recoger en gym" como entregados, venta de mostrador (descuenta stock local), validar QR de acceso. Fase 2 (completa) agrega corte de caja, roles gerente/mostrador, reportes/inventario local de gerente, y captura de asistencia. Solo lo usa el staff en la sucursal — sin necesidad de SEO.

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

## Métodos de acceso: QR, huella y nombre (huella 2026-09-12, nombre + refactor a `AccessMethod` 2026-09-12)

No todos los socios tendrán la app instalada — además del QR, se puede dar de alta a un socio directo en mostrador con su huella, y validar su acceso en `/qr` por huella o, como último recurso si tampoco funciona el lector, buscándolo por nombre. Alcance de huella decidido con el usuario: **solo altas nuevas sin app** (no se agrega huella a un socio que ya tiene cuenta/QR de la app). Huella sigue **mockeada** — el lector ya está instalado físicamente en sucursal, pero no se conoce el SDK/driver real (WebUSB, agente local, etc.); mismo criterio contract-first que el resto del proyecto, esa es la costura a reemplazar cuando se tenga ese detalle.

### `lib/access/` — patrón Strategy, un contrato para los 3 métodos

Los 3 métodos de entrada (QR / huella / nombre) implementan la misma interfaz en vez de vivir como métodos sueltos de un repository que crece cada vez que se agrega uno nuevo (así vivía antes de este refactor: `qrAccessRepository.validate()` + `.validateByFingerprint()` en un solo `IQrAccessRepository`, retirado):

- **`lib/access/AccessMethod.ts`** — la interfaz compartida: `interface AccessMethod { id; checkAccess(query, branchId): Promise<AccessCheckResult> }`, más el tipo `AccessCheckResult` (`not_found | ambiguous | wrong_branch | expired | valid`) y `isAccessGranted()`. `QrValidationPage` depende SOLO de esta interfaz (Dependency Inversion) — nunca de una clase concreta.
- **`lib/access/evaluateAccess.ts`** — la regla de negocio (tier `single` fuera de `homeBranchId` → `wrong_branch`, `expired` deniega antes que cualquier otro chequeo, `grace` cuenta como `valid`), pura y sin I/O, con su propio `evaluateAccess.test.ts` que la prueba sin pasar por ningún mock/delay — el corte típico de Clean Architecture entre la regla (entity/use-case) y "cómo se llega al dato" (cada método).
- **`lib/access/methods/{qr,fingerprint,name}AccessMethod.ts`** — una clase por método, cada una: resuelve `query` a un `MemberAccessRecord` a su manera, y le aplica `evaluateAccess()`. `QrAccessMethod`/`FingerprintAccessMethod` buscan match exacto (`qrCode`/`fingerprintId`); `NameAccessMethod` busca por substring de `memberName` — 0 matches → `not_found`, 1 → evalúa normal, 2+ → `ambiguous` con todos los candidatos (único outcome que solo produce este método). Cada uno con su test — mismo criterio que el resto del proyecto ("cada repository tiene su test de Vitest"), aquí "cada `AccessMethod` tiene el suyo".
- **`lib/access/methods/index.ts`** — registro `ACCESS_METHODS: AccessMethod[]` + exports nombrados (`qrAccessMethod`, `fingerprintAccessMethod`, `nameAccessMethod`). Agregar un 4to método de entrada es agregar una clase + una línea acá (Open/Closed) — no toca `evaluateAccess.ts` ni las otras clases, y `QrValidationPage` no necesita conocer métodos que no está usando (Interface Segregation).
- **Desambiguar un `ambiguous`** no es un caso especial: el staff confirma con el socio y hace click en el candidato correcto, lo que dispara `qrAccessMethod.checkAccess(candidate.qrCode, branchId)` — todo `MemberAccessRecord` tiene un `qrCode` interno único (incluso los dados de alta por huella, ver abajo), así que resolver la ambigüedad es solo "volver a preguntar, esta vez con un credential exacto".

### Huella dactilar (alta en mostrador)

- **`MemberAccessRecord.fingerprintId?: string`** (`@mucho-loco/types`) — opcional, set solo cuando el alta fue por huella. El registro SIEMPRE conserva su `qrCode` interno (identidad del registro usado por mostrador para buscar/renovar, `generateQrCode()` sin cambios) aunque el socio nunca lo vea ni lo necesite.
- **`lib/fingerprintScanner.ts`** (`captureFingerprint()`) — simula el sensor de ALTA: delay + `crypto.randomUUID()` para un id sin colisión. A diferencia de validar acceso (donde dos lecturas del mismo dedo deben dar el MISMO id — por eso los registros demo de `/qr` usan ids fijos, `FP-DEMO-ROSA`/`FP-DEMO-LUIS`), enrolar a alguien nuevo no necesita reproducibilidad, cualquier id nuevo sirve.
- **`/counter` → Membresías → Nuevo socio`**: selector de método de acceso (QR / Huella). Con huella, un botón "Escanear huella" simula la lectura (`captureFingerprint()`) antes de poder confirmar el alta — igual que la cámara de QR, requiere una acción explícita del staff, no arranca sola.

### `/qr` — las 3 secciones

Tres secciones independientes (QR con cámara+manual, huella con manual, nombre con manual), cada una atada a su propio `AccessMethod`, todas comparten el mismo panel de resultado (`ACCESO PERMITIDO` / `SUCURSAL INCORRECTA` / `MÁS DE UN SOCIO COINCIDE` / etc.) sin importar qué método lo disparó — `QrValidationPage` arma ese panel desde un único `AccessCheckResult`, nunca desde un tipo distinto por método.

Datos demo en `lib/data.ts`: Rosa Jiménez (`FP-DEMO-ROSA`, tier `all`, Roma Sur — pasa en cualquier sucursal), Luis Herrera (`FP-DEMO-LUIS`, tier `single`, Interlomas — debe rechazarse con `wrong_branch` si se valida en Roma Sur), y Carlos Vega (comparte nombre de pila con el ya existente Carlos Mendoza, a propósito, para demostrar `ambiguous` al buscar "Carlos").

## Capas en `src/lib/`

Mismo patrón mock-first que `customer-app`: `datasources/mock/` (datos + delay simulado) → `repositories/` (`I*Repository` + instancia singleton, con el comentario "Swap this line..." marcando la costura hacia el backend real) → `stores/` (Zustand, un store por recurso vía `createAsyncResource`). Cada repository tiene su test de Vitest.

## Swap de datasource: mock ↔ backend NestJS (2026-09-12, parcial)

Igual que hizo `customer-app` — misma variable, mismo patrón, mismo default: **sin configurar nada, este app sigue en mocks** y arranca sin Postgres ni backend.

```bash
# .env.local (o inline)
VITE_DATA_SOURCE=http          # cualquier otro valor / ausente = mock
VITE_API_URL=http://localhost:3001
```

**Migrado hasta ahora: `counterSale`** (inventario de la sucursal + venta de mostrador). Los otros 5 repositorios (`pickupOrder`, `cashRegisterShift`, `attendance`, `reports`, `membership`) siguen en mock — el backend YA los cubre, solo falta el datasource de este lado.

### Diferencias con el cliente HTTP de customer-app

`src/lib/datasources/http/client.ts` es gemelo del de `customer-app`, con dos cambios que vienen de ser una SPA:

- **El token sale del store de auth** (`useAuthStore`, persistido en localStorage), no de una cookie httpOnly — este app no tiene servidor propio donde leerla.
- **No hay caché de framework** que configurar (`revalidate` es de Next).
- **`?lang=`** se agrega solo en los endpoints donde el backend aplana un `LocalizedString` a texto (nombre de producto). El idioma sale de i18next, no de una prop.

Cuando `owner-panel` haga este mismo swap serán tres copias de este cliente y valdrá la pena extraerlo a un paquete compartido. No antes: con tres consumidores a la vista la abstracción correcta se ve, adivinarla con uno solo no.

### Errores tipados: por qué el backend ahora manda códigos

`counterSale.errors.ts` siempre dijo que un datasource real debe rechazar con los MISMOS tipos de error "so the UI layer never has to read a raw error message". Para poder cumplirlo, el backend dejó de mandar solo prosa en español y ahora incluye un código de máquina en el cuerpo del 4xx (`apps/backend/src/common/error-codes.ts`):

| Código del backend | Error del contrato |
|---|---|
| `INSUFFICIENT_STOCK` | `InsufficientStockError` (con `productName`, que la UI muestra) |
| `PRODUCT_NOT_FOUND` | `ProductNotFoundError` |
| `BRANCH_DOES_NOT_STOCK_PRODUCT` | `ProductNotFoundError` — para quien cobra es lo mismo: no se puede vender aquí |

Cualquier otro fallo (500, red caída) se deja pasar tal cual: un backend muerto no es un error de negocio y disfrazarlo de "sin stock" sería mentirle a mostrador.

### Un cambio en el mock, para que el swap no se note

`BRANCH_INVENTORY` escribía `productName` a mano y a veces se saltaba el sabor (`'Shaker Loco'` vs `'Whey Protein 5LBS · Strawberry'`). El backend lo arma siempre igual (`nombre · sabor`), así que prender el flag cambiaba el texto en pantalla. El mock ya está alineado — el swap no debería verse.

### Testing

- **Unit** (`pnpm test`, sin red): `counterSale.http.test.ts` — cada método a su ruta, el token en la cabecera, `?lang=` según idioma, y las tres traducciones de error (más la que NO se traduce).
- **Integración** (`pnpm test:integration`, contra el backend real en `:3001`, fuera de CI): verifica que **la ruta existe y el guard la protege**. Un error de dedo en la URL pasa todos los unitarios —afirman contra la misma URL equivocada— y solo se cae en producción; aquí se cae como un 404. La respuesta autenticada campo por campo la cubre `test/branch-ops.e2e-spec.ts` del backend, que sí puede sobreescribir el verifier.

### Verificado en navegador real (2026-09-12) ✅

Se levantó el User Pool un momento (`terraform apply -target=module.cognito`, gratis), se dio de alta a Luis con grupo `staff`, y se manejó Chromium con Playwright:

1. Login real contra Cognito → `/counter`.
2. El inventario que pintó la pantalla salió de Postgres: `Stock: 200` para el Energy, `AGOTADO` con el `+` deshabilitado para el BCAA (que está en 0 en la base), y los nombres armados por el backend (`Shaker Loco · 700ml`, no `Shaker Loco`).
3. Se vendieron 2 → **"✓ Venta confirmada por $90"** (45 × 2, precio puesto por el servidor).
4. En Postgres: `branch_inventory` de Roma Sur bajó 200 → 198, se creó la fila en `counter_sales` con su ítem, y **las otras 3 sucursales quedaron intactas** — el stock es local, como manda la regla de negocio.
5. Cero errores de consola.

Después se restauró el seed y se destruyó el pool. Para repetirlo hace falta volver a levantar Cognito.

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
- ✅ Fase 2, corte de caja + primer permiso real por rol (2026-09-11): `/cash-register`, solo `manager` (nav item oculto para `staff` en `AppShell`, y la ruta va detrás de `RequireManager.tsx` — autorización, no autenticación, `ProtectedRoute` se queda role-agnostic a propósito). `cashRegisterShiftRepository` sigue el mismo patrón open/closed que `owner-panel/payroll.repository.ts`: siempre hay a lo más un `CashRegisterShift` `'open'` por sucursal (`getOpenShift` lo crea si no hay uno), `closeShift` es una transición final (no reabre — el siguiente shift se crea solo la próxima vez que se pide el abierto). Junta `COUNTER_SALES` + `MEMBERSHIP_PAYMENTS` de esa sucursal en la ventana del shift como `ShiftTransaction[]`; los totales por método de pago (`cash`/`card`/`transfer`) son una función pura (`lib/cashRegister.ts`, `calculateShiftTotals`) con su propio test, no lógica en el componente. **Prerequisito que se descubrió al construir esto:** `counterSale.mock.ts` nunca persistía las ventas (`createSale()` solo devolvía el objeto y descontaba stock) — ahora también hace `COUNTER_SALES.push(sale)`, si no no había nada que sumar para ningún corte.
- ✅ Fase 2 completa, reportes/inventario local de gerente: `/reports`, solo `manager` (mismo `RequireManager.tsx`). Reporte de ventas de 7 días (ingresos, transacciones, desglose por día, top 5 productos) vía `calculateSalesReport()` (`lib/reports.ts`, función pura con su propio test, mismo patrón que `cashRegister.ts`) sobre `COUNTER_SALES`/`MEMBERSHIP_PAYMENTS` — distinto del corte de caja (que es por turno, para cuadrar el cajón; esto es tendencia, sin importar turnos). Reutiliza `useBranchInventoryStore` ya existente para el inventario local, con bandera de "stock bajo" (`isLowStock()`, umbral `LOW_STOCK_THRESHOLD`). Se sembró una semana de `COUNTER_SALES`/`MEMBERSHIP_PAYMENTS` ilustrativos (branchId 1) para que el reporte no se vea vacío en el primer load.
- ✅ Captura real de asistencia (2026-09-11), precondición de nómina real: `/attendance`, abierta a ambos roles — cualquier staff registra su propia entrada/salida (`AttendanceEntry`, a lo más una "abierta" por `staffEmail` a la vez, mismo invariante que `CashRegisterShift` pero por persona en vez de por sucursal); `manager` además ve la asistencia del equipo de hoy. Vive aislada en el mock de este app, como todo lo demás hasta que exista backend real — el payroll de `owner-panel` sigue leyendo su propio `AttendanceSummary` sembrado hasta que ambos apps compartan una base de datos real.
