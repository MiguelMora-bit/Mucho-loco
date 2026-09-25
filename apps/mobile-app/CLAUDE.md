# CLAUDE.md — apps/mobile-app

Visión de negocio completa y estructura del monorepo: ver [`CLAUDE.md`](../../CLAUDE.md) en la raíz.

## Qué es este app

La app del socio nativa (iOS + Android) de Mucho Loco Gym: el mismo socio y el mismo contrato de datos que `apps/customer-app` (web), con UI nativa. **Expo SDK 57 + Expo Router + TypeScript strict.**

**Expo cambia rápido entre SDKs**: antes de escribir código contra una API de Expo, leer la doc de la versión exacta — https://docs.expo.dev/versions/v57.0.0/ — no la de "latest" ni de memoria. Para agregar paquetes nativos usar `npx expo install <pkg>` (elige la versión compatible con el SDK), no `pnpm add`.

### Por qué React Native + Expo y no Flutter (2026-09-12)

Ver el párrafo en el CLAUDE.md raíz. Resumen: todo lo que no es UI ya era TypeScript puro y se comparte vía `@mucho-loco/customer-core` + `@mucho-loco/types`; con Dart había que reescribirlo y mantener el contrato en dos lenguajes. La UI sí se escribe aparte — eso pasa con cualquier framework.

## Estructura

```
src/
  app/                    # rutas por archivo (Expo Router ≈ App Router de Next)
    _layout.tsx           # Stack raíz: fuentes, splash, restaurar sesión, tema oscuro
    (tabs)/               # grupo — no aparece en la URL: /shop, no /(tabs)/shop
      _layout.tsx         # Tabs: Inicio · Tienda · Sucursales · Cuenta
      index.tsx shop.tsx branches.tsx account.tsx
    product/[id].tsx      # segmento dinámico, igual que en Next
    cart.tsx              # modal
    checkout.tsx
    login.tsx             # modal (lo abre el checkout sin sesión)
    qr.tsx                # QR de acceso a pantalla completa
    order/[id].tsx        # detalle de pedido (modal) con QR de retiro = id del pedido
    community.tsx         # feed interno entre socios: publicar, like, comentar
    performance.tsx       # resumen, entrenamientos y heatmap
    membership.tsx        # contratar/renovar la membresía (sucursal, tier, periodo → Stripe)
    auth/callback.tsx     # regreso del login social (mucholoco://auth/callback)
  components/             # ui.tsx (Display/Heading/Body/Mono/Button/Card/Screen…), ProductCard, auth/AuthPanel (login/registro/código), account/Dashboard
  lib/
    repositories.ts       # ÚNICO lugar donde se decide mock vs HTTP
    api.ts                # cliente HTTP (api-client) con el token de la sesión
    auth/                 # AuthService: MockAuthService (default) o CognitoAuthService; sesión en SecureStore
    stores/               # zustand: session, cart (AsyncStorage)
    i18n.ts               # useT(): { t (textos compartidos), m (solo móvil), lang }
    cart.ts checkout.ts   # lógica pura, con tests
  theme.ts                # paleta y fuentes = `ml.*` de tailwind.config.js de la web
assets/images/            # bull-head.png (ícono/splash provisional) y fotos de producto empaquetadas
tests/e2e/                # recorrido completo del socio con Playwright (versión web)
```

## Qué comparte con customer-app y qué no

| Compartido (`@mucho-loco/customer-core`, `@mucho-loco/types`) | Propio de este app |
|---|---|
| Interfaces `I*Repository` (`./contract`), mocks (`./mock`) y datasources HTTP (`./http`) | Pantallas y componentes (no hay DOM ni Tailwind) |
| `PRODUCT_CATS`, `formatPrice`, `calculateMembershipPrice`, `HOME_SHIPPING_FEE` | Sesión en el llavero del SO en vez de cookie httpOnly |
| `formatDate`/`formatDuration`/…, `orderStatusLabel` | Navegación (Stack + Tabs) en vez de middleware + rutas |
| Todos los textos (`./translations`, tipado contra `Translations`) | `lib/mobile-messages.ts`: solo lo que la web no tiene (pestañas, "cómo llegar") |

Regla: si algo no depende de React Native ni de Next, va a customer-core. Si depende de uno de los dos, se queda en su app.

## Mock-first (igual que arrancó customer-app)

- **Datos**: `lib/repositories.ts` elige mock (default) o HTTP según `EXPO_PUBLIC_DATA_SOURCE` — ver "Swap a backend" abajo. Las pantallas solo conocen las interfaces del contrato.
- **Auth**: `MockAuthService` (default) acepta cualquier email con contraseña de 8+ caracteres. `diego@mucholoco.mx` (tier `all`) y `valeria@mucholoco.mx` (tier `single`) muestran los datos curados de los mocks; cualquier otro email recibe el perfil genérico de `fallbackRecord`. El registro aplica la misma política de contraseña que el User Pool y el código de confirmación es `123456`. Cognito real: ver "Auth: mock o Cognito" abajo.
- **Pago**: con tarjeta el flujo YA es el real — `paymentRepository.createCheckoutSession` + `WebBrowser.openAuthSessionAsync` hacia Stripe, regresando por deep link `mucholoco://checkout?paid=1`. El mock devuelve directo la URL de éxito (ver `payment.mock.ts`), así que en modo mock no se abre navegador. Efectivo solo con "recoger en gym". Nada más (2026-09-14): "transferencia" se quitó porque creaba el pedido como pagado sin cobrar nada; Stripe ya ofrece OXXO y SPEI en su página. Un envío muestra "EN CAMINO" y la guía cuando bodega lo manda.

## Swap a backend (2026-09-12)

```bash
# .env.local (gitignored — plantilla en .env.example)
EXPO_PUBLIC_DATA_SOURCE=http                # cualquier otro valor / ausente = mock
EXPO_PUBLIC_API_URL=http://localhost:3001   # en el TELÉFONO: la IP de la Mac, no localhost
```

- **Los mismos datasources que customer-app**: `@mucho-loco/customer-core/http`, sobre `@mucho-loco/api-client`. Aquí solo va la política del teléfono (`lib/api.ts`): el token sale de la sesión (llavero) y no hay `cachePolicy` — el `maxAgeSeconds` que declaran los datasources no hace nada fuera de Next.
- **Verificado contra el backend real** (Postgres local): avisos, tiers, sucursales y los 18 productos llegan del backend con 200, sin errores de CORS.
- **Con el login mock, la cuenta da 401**: el backend solo acepta ID tokens de Cognito. Panel, pedidos, comunidad y rendimiento en modo HTTP necesitan `EXPO_PUBLIC_AUTH=cognito` con un User Pool vivo; con el mock muestran "Error de conexión". Es lo esperado, no un bug.
- **Ojo con la precedencia en desarrollo**: con `expo start` (dev), el módulo virtual de env de Expo carga `.env`, `.env.development`, `.env.local` y `.env.development.local` y los mezcla ENCIMA de las variables de la shell — `EXPO_PUBLIC_AUTH=mock pnpm start` NO gana sobre un `.env.local` que diga `cognito`, y `EXPO_NO_DOTENV` no aplica ahí. Para cambiar de modo en dev, cambiar `.env.local`. Por eso el spec de Playwright corre con `--no-dev`: en producción las variables se incrustan desde la shell. Se descubrió porque el spec, con un `.env.local` real presente, registró un usuario de verdad en Cognito.
- El backend permite `localhost:8081` por CORS (la versión web). El app nativo no pasa por CORS.

## Auth: mock o Cognito (2026-09-12)

```bash
# .env.local
EXPO_PUBLIC_AUTH=cognito                                        # ausente/otro = MockAuthService
EXPO_PUBLIC_COGNITO_REGION=us-east-1
EXPO_PUBLIC_COGNITO_CLIENT_ID=<terraform output mobile_client_id>
EXPO_PUBLIC_COGNITO_DOMAIN=<terraform output cognito_domain>    # solo login social
```

- **`CognitoAuthService` habla con Cognito directo** (`lib/auth/cognito.ts`): POST JSON a `cognito-idp.<region>.amazonaws.com` con la operación en `X-Amz-Target` — `InitiateAuth` (contraseña y refresh), `SignUp`, `ConfirmSignUp`, `ResendConfirmationCode`, `RevokeToken`. Sin SDK y sin servidor en medio: el app client es público (sin secreto). En customer-app esto mismo lo hacen las rutas `/api/auth/*` de Next. Los errores se traducen con `cognitoErrorCode` de customer-core — los mismos códigos y mensajes que la web.
- **App client propio, `mobile`** (`infra/modules/cognito`): callbacks `mucholoco://auth/callback` y `http://localhost:8081/auth/callback`, `enable_token_revocation`. Su ID ya va en `COGNITO_CLIENT_IDS` del backend (`infra/envs/dev`). **Sin rotación de refresh token**, a propósito: con rotación Cognito rechaza `REFRESH_TOKEN_AUTH` y hay que usar `GetTokensFromRefreshToken`. El token vive en el llavero del SO, no en localStorage; rotarlo es endurecimiento futuro.
- **El registro pide teléfono** (normalizado a E.164 en `lib/phone.ts`) y lo manda como `phone_number`. El backend lo lee del ID token al crear al socio — así funcionan los avisos de WhatsApp para cuentas creadas desde el app. Código de 6 dígitos por email → al confirmar entra solo. Si alguien intenta entrar con una cuenta sin confirmar, se le reenvía el código y se le lleva a escribirlo.
- **Sesión** (`stores/session.store.ts`): `{ idToken, refreshToken, expiresAt }` en el llavero. `getFreshIdToken()` —el `getToken` del cliente HTTP— refresca 5 min antes de que venza el token, con UN solo refresh en vuelo aunque el panel pida 4 cosas a la vez. Si Cognito rechaza el refresh (revocado, o pasaron los 30 días) se cierra la sesión; si lo que falla es la red, NO: el QR tiene que abrir sin señal.
- **Logout = `RevokeToken`** del refresh token: invalida también los ID tokens emitidos con él, pero solo en este teléfono.
- **Google/Facebook**: Hosted UI + authorization code + PKCE (`lib/auth/social.ts`, `expo-auth-session`), con `identity_provider` para saltar el selector de Cognito, igual que la web. `AuthRequest` genera el PKCE (S256) y valida el `state`; el canje del code lo hace `cognito.ts`. Los botones solo aparecen con `EXPO_PUBLIC_COGNITO_DOMAIN`. **No funciona en Expo Go** (su scheme es `exp://`, no registrable en Cognito): se prueba con un build de desarrollo (`npx expo run:ios` / EAS).
- **Verificado contra Cognito real (2026-09-12)** — versión web del app + backend local + Postgres, pool `us-east-1_b3eTLBZtB`:
  - contraseña incorrecta → `NotAuthorizedException` → el mismo mensaje que la web;
  - login → panel con datos del backend; el socio se creó con el `phone_number` del token;
  - token vencido a mano → UN `REFRESH_TOKEN_AUTH`, y todo el panel en 200;
  - logout → `RevokeToken`, y después Cognito rechaza ese refresh token ("Refresh Token has been revoked");
  - registro real con teléfono → la cuenta queda `UNCONFIRMED` con `+52…` en Cognito;
  - código incorrecto → `CodeMismatchException` mapeado; login de una cuenta sin confirmar → reenvía el código y vuelve a esa pantalla.

  Además `cognito.test.ts` fija la forma exacta de cada request. **Sin probar**: confirmar con un código real (el registro de prueba usó `@example.com` para no mandarle correo a nadie), Google/Facebook (sin apps OAuth ni build de desarrollo) y el app nativo en un teléfono.

## Registrar entrenamientos (2026-09-25)

Spec 017. Rendimiento → Entrenamientos tiene "REGISTRAR ENTRENAMIENTO" → pantalla `workout/new` (nombre, Hoy/Ayer, duración opcional, ejercicios con series reps × kg; "+ SERIE" copia la anterior; kg vacío = peso corporal; valida con `workoutProblem` de customer-core antes de mandar). La lista muestra series, volumen (`formatKg`) y los récords que calculó la regla, y "Borrar" pide un segundo toque. La pantalla relee al volver (`useFocusEffect`). La captura vive solo aquí: es lo que el socio trae en el gimnasio. Walkthrough: rechazo sin nombre de ejercicio → guardar → récord de 110 kg y "1 series · 550 kg vol" → borrar.

## Resumen de Rendimiento (2026-09-25)

Spec 018. Las tarjetas de Resumen salen de `PerformanceSummary` con `performanceCards` de customer-core (el mismo helper que la web: texto traducido y color de paleta), y los récords son los últimos que marcó la regla ("105 KG · +10 kg"). En mock, la racha es la de la membresía curada (7, mejor 14) y los entrenamientos de Diego son de junio: este mes sale en cero, honesto.

## Heatmap de asistencia (2026-09-25)

Spec 016. `performanceRepository.getHeatmap(email)` devuelve la asistencia real (en mock, del historial de visitas con `heatmapFromVisits` de customer-core — antes `Math.random()` en cada llamada). Una columna por semana; el scroll horizontal abre en la semana actual (`scrollToEnd` al medir el contenido). El walkthrough cuenta las 6 visitas de Diego.

## Teléfono del socio (2026-09-25)

Spec 015. Sin teléfono, el panel de Cuenta muestra "Agrega tu teléfono" con el campo (`components/account/PhoneEditor.tsx`, `toE164` antes de enviar, `userRepository.updatePhone`); con teléfono, "Teléfono: … · Cambiar". `MockAuthService` guarda el teléfono del registro en el mock de usuarios al confirmar la cuenta — lo mismo que hace el backend con el claim `phone_number` —, así una cuenta recién creada no ve el aviso. Walkthrough: cambiar el de Diego (con el rechazo de "55 12"), el de la cuenta nueva llega del registro, y un tercer test donde un socio sin teléfono (login social) lo completa.

## Membresía (2026-09-13)

Un socio nuevo nace **sin membresía** (`getMembership()` → `null`) hasta su primer cobro — antes el mock y el backend le regalaban una. El panel lo dice y lleva a la pantalla `membership`: sucursal, tier y periodo → `paymentRepository.createMembershipCheckout` → Stripe con `WebBrowser.openAuthSessionAsync` y regreso por deep link (`mucholoco://membership?paid=1`), el mismo patrón del checkout. En gracia, "REINTENTAR PAGO" abre la factura pendiente de Stripe (`openMembershipInvoice`) con `WebBrowser.openBrowserAsync`. Las reglas (qué rechazaría el backend, respetar lo ya pagado) salen de `@mucho-loco/customer-core/membership-rules`, las mismas que la web; `renewalStartsOn()` se llama al cargar datos, no al pintar (el lint prohíbe `Date.now()` en el render). Detalle del cobro en "Membresías con Stripe Billing" de `apps/backend/CLAUDE.md`. El walkthrough de Playwright cubre la compra: cuenta nueva sin membresía → elige plan → paga (mock) → vuelve con QR y "se renueva sola".

## Administrar suscripción — portal de Stripe (2026-09-24)

Spec 005. En el panel de Cuenta, "Administrar suscripción" (con "Se renueva sola") y el banner de renovación cancelada con "Reactivar renovación": `paymentRepository.openBillingPortal` + `WebBrowser.openAuthSessionAsync(url, Linking.createURL('/account'))`, y al volver se relee la membresía. Mismo pendiente que el checkout: confirmar en un teléfono que Stripe acepte el scheme custom como `return_url`. Walkthrough: cancelar → reactivar (mock).

## Facturar (CFDI) — 2026-09-24

Spec en `specs/002-mobile-cfdi-invoicing/`. Misma funcionalidad que `/invoicing` de la web, sobre el MISMO contrato de customer-core (`IInvoicingRepository`, mock/HTTP, `invoicingErrorOf`, catálogo `./fiscal`, textos `invoicing`) — aquí solo hay UI.

- **Pantalla `invoicing`** (Stack), botón FACTURAR en el panel de Cuenta. Componentes en `src/components/invoicing/` (`FiscalForm`, `ChargeRow`, `ConfirmCard`). Régimen y uso de CFDI son `Chip` (no hay `<select>` nativo); el uso solo ofrece lo que el SAT admite para el régimen.
- **Sin Route Handlers**: el app llama al repositorio directo (el token vive en el llavero). Tras un rechazo por cambio de estado, recarga la lista.
- **PDF/XML** con la hoja de compartir del sistema (`src/lib/share-file.ts`: `expo-file-system` escribe en `Paths.cache`, `expo-sharing` abre el compartir con `mimeType` + UTI). En web, `share-file.web.ts` descarga. Una URL en el navegador no serviría: la descarga necesita el token.
- **`expo-sharing` fijado en 57.0.21**: `npx expo install` eligió 57.0.22 (publicada ese mismo día) y agregó una excepción a `minimumReleaseAgeExclude` del workspace. Se quitó la excepción y se fijó la anterior para no saltarse el candado de antigüedad. Subir a `~57.0.x` cuando cumpla la antigüedad.
- **WhatsApp de soporte** sale de `@mucho-loco/customer-core/contact` (movido desde customer-app para compartirlo).
- **Verificado**: walkthrough de Playwright en Expo web, modo mock (datos fiscales con errores y filtro 605 → rechazo del SAT → corregir → facturar → descarga PDF → WhatsApp con folio). **Solo en teléfono real**: la hoja de compartir nativa.

## Decisiones

- **Sesión en `expo-secure-store`** (Keychain/Keystore), nunca AsyncStorage (texto plano). `secure-storage.web.ts` usa localStorage: la versión web solo existe para desarrollar y probar, no se publica. Metro elige el archivo por plataforma (`.web.ts` vs `.ts`).
- **`Tabs` de expo-router, no `NativeTabs`**: NativeTabs sigue en `expo-router/unstable-native-tabs` y en web pide implementación aparte. Cambiar a nativas es una mejora visual futura, no toca las pantallas.
- **`useResource(load)`** (`lib/use-resource.ts`) reemplaza lo que en la web hace el Server Component: cada pantalla pide sus datos al montarse. `load` tiene que venir de `useCallback` o la pantalla recarga en bucle.
- **Imágenes relativas del catálogo** (`/assets/prod-*.jpg`, servidas por `public/` de la web) van empaquetadas y se resuelven en `lib/images.ts`. Cuando el catálogo use URLs absolutas de un CDN, ese mapa se borra.
- **"Cómo llegar" abre la app de mapas** del teléfono (Apple Maps / Google Maps) en vez de un mapa embebido.
- **QR**: `react-native-qrcode-svg` con `membership.accessCode` — el mismo valor que pinta `QrModal` en la web y que valida branch-app. Se lee del repositorio, no de parámetros de la ruta. Sube el brillo al máximo mientras está abierto (`use-max-brightness.ts`).
- **eslint fijado en 9**: `expo install eslint` trae la 10, y `eslint-plugin-react` (dentro de `eslint-config-expo`) truena con ella (`contextOrFilename.getFilename is not a function`).
- **`web.output: "single"`** (SPA) en `app.json`: el render estático del template intentaría ejecutar SecureStore/AsyncStorage en Node.
- **Rutas tipadas** (`experiments.typedRoutes`): los tipos de `router.push('/…')` los genera `expo start` en `.expo/types` (gitignored). Si `tsc` rechaza una ruta recién creada, reiniciar Metro los regenera. En CI no existen, así que ahí no se validan las rutas — solo el resto del tipado.
- **Comunidad recarga el feed** tras publicar/like/comentar en vez de parchar el estado local: el servidor es la fuente de verdad.
- **QR de retiro solo para "recoger en gym"**: la web lo muestra en cualquier pedido no entregado, incluidos los de domicilio, que no se recogen en ninguna sucursal.
- Del template no se copió `.claude/settings.json` (activaba el plugin `expo@claude-plugins-official`). Si se quiere, se activa a propósito.

## Comandos

```bash
pnpm --filter @mucho-loco/mobile-app start      # Metro; escanear el QR con Expo Go en el teléfono
pnpm --filter @mucho-loco/mobile-app web        # versión web, para desarrollo/Playwright
pnpm --filter @mucho-loco/mobile-app typecheck
pnpm --filter @mucho-loco/mobile-app lint
pnpm --filter @mucho-loco/mobile-app test       # vitest, lógica pura de src/lib
pnpm --filter @mucho-loco/mobile-app test:e2e   # recorrido completo en Playwright (levanta Expo web en modo mock)
```

## Testing

- **Vitest** para lógica pura de `src/lib` sin imports de React Native (`cart.ts`, `checkout.ts`, `auth/`). Incluye la regresión de seguridad de la web: las líneas de un pedido solo llevan `productId` + `qty`, nunca precio.
- **Flujos** (`pnpm test:e2e`, `tests/e2e/walkthrough.spec.ts`): esta máquina no tiene Xcode ni Android SDK (no hay simulador), así que el recorrido corre en Expo web + Playwright en viewport de teléfono, siempre en modo mock (`playwright.config.ts` levanta Expo si no está corriendo): tienda → carrito → login → checkout con tarjeta → pedido y QR de retiro → QR de acceso → comunidad → rendimiento → sucursales → idioma → recarga con sesión restaurada → logout. Un solo test con `test.step`, porque cada paso depende del estado del anterior. No corre en CI todavía (necesita Chromium + Metro en el runner).
- **Inestabilidad conocida del walkthrough (medida 2026-09-24)**: con el servidor recién arrancado (`--clear`) el primer bundle puede tardar ~15 min si la máquina está cargada, y el test se come su timeout esperando. Y aun con el servidor caliente, ~1 de cada 3 corridas se atora en un paso al azar (checkout "PROCESANDO", comunidad) con una promesa de mock que no se resuelve — pasa igual con el código anterior a facturación, así que no es de una pantalla en particular. Para una corrida confiable: arrancar el servidor, pedir el bundle una vez (`curl` al `.bundle` que referencia `index.html`) y correr `./node_modules/.bin/playwright test` reusándolo. Correr `pnpm test:e2e` en un árbol con dependencias distintas poda `node_modules` (pnpm verifica deps antes del script).
- **Lo que Expo web NO prueba** (solo en un teléfono real con Expo Go): SecureStore, brillo, `Intl` de Hermes (`formatDate` usa `timeZone: 'UTC'`), el regreso de Stripe por deep link, íconos y splash.
- Ojo al escribir selectores de Playwright: en web las pantallas de abajo del Stack siguen en el DOM (ocultas), así que un texto puede aparecer dos veces. Usar `exact: true`.

## Pendiente (siguiente paso)

1. **Probar en un teléfono** con un build de desarrollo (`npx expo run:ios` / EAS): llavero, `Intl` de Hermes, y los regresos por deep link (login social y Stripe). Google/Facebook necesitan además las apps OAuth reales (ver "Nota operativa" raíz).
2. **Stripe con deep link**: el backend acepta `successUrl`/`cancelUrl` como cualquier string, pero falta confirmar que Stripe acepte un scheme custom; si no, página https puente o universal link.
3. Mapa nativo (`react-native-maps`).
4. Íconos y splash reales: hoy es `bull-head.png` (512px con transparencia); iOS pide 1024px sin alfa.
5. Builds con EAS para instalar fuera de Expo Go.
6. Correr `test:e2e` en CI.

### Hallazgos de contrato (afectan también a la web)

1. ~~**Dirección de envío que nunca se envía.**~~ ✅ Resuelto (2026-09-14): el contrato recibe `OrderDelivery` (`{ method: 'pickup' }` o `{ method: 'home', address }`, así "a domicilio sin dirección" no compila). Los dos checkouts la validan con `parseShippingAddress` de customer-core (el teléfono sale en E.164; `toE164` se mudó a `@mucho-loco/customer-core/phone`) y el backend con `ShippingAddressDto`. El detalle de un pedido a domicilio muestra a dónde se envía en vez del QR de retiro. El campo de texto del registro (`Field`) ahora es `components/Field.tsx`, compartido con el checkout.
2. ~~**Colores escritos en CSS.**~~ ✅ Resuelto (2026-09-25, spec 010): `PerformanceStat.color` es un `StatColor` (`'red' | 'orange' | 'yellow' | 'gold' | 'green' | 'cream'`), un nombre de la paleta. La web lo pinta como `var(--<nombre>)` y el móvil como `colors[<nombre>]` de `theme.ts`; `lib/css-color.ts` ya no existe. El backend normaliza lo que haya en base (`statColorOf`) y una migración de datos convirtió las filas viejas.
3. ~~**Nombre del plan sin traducir.**~~ ✅ Resuelto (2026-09-25, spec 011): `MembershipInfo.plan` (`'ALL GYMS · MENSUAL'` en cualquier idioma) se quitó; el contrato manda `tierKey` + `periodKey` y el panel lo arma con `membershipPlanLabel` de customer-core, igual que la web.
