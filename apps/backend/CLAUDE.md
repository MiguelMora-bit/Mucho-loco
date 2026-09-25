# CLAUDE.md — apps/backend

Visión de negocio completa y estructura del monorepo: ver [`CLAUDE.md`](../../CLAUDE.md) en la raíz — sección "Arquitectura de backend" para las decisiones ya tomadas (NestJS sobre AWS nativo, Postgres/RDS, Cognito, ECS Fargate, Terraform) antes de tocar este código.

## Qué es este app

API REST que reemplaza, dominio por dominio, los repositorios mock de `customer-app` — contract-first: cada método de `I*Repository` en `customer-app/lib/repositories/*.ts` es el contrato que un endpoint de aquí tiene que cumplir. Cuando un dominio esté migrado, `customer-app` solo cambia el datasource (mock → HTTP), nunca el resto del app (componentes, stores, tipos).

**Estado (2026-09-12): 8 dominios migrados.** `branches`, `products`, `membership-tiers` (catálogo) y `users/me/*` (perfil, membresía, visitas, pedidos) — los 4 que el CLAUDE.md raíz nombraba explícitamente para el primer corte ("branches, products, orders, memberships"). Más `announcements`, `social` (links + feed de marketing), `performance` (stats/records/workouts/heatmap) y `community` (feed interno entre socios) — la segunda pasada, ver detalle de cada uno abajo ("Segunda pasada: community/announcements/social/performance"). `customer-app` sigue usando sus datasources mock para TODO — el swap real (Fase 5 de la metodología) todavía no se hizo, este backend hoy corre standalone, verificado con tests y curl, no conectado a ningún frontend.

### Segunda pasada: community/announcements/social/performance (2026-09-12)

- **`announcements` y `social`** (links + feed de marketing) son contenido editorial fijo (igual que `branches`/`products`/`membership-tiers`): tabla semillada, endpoints `@Public()`, sin lógica de negocio. `social` expone `GET /social/links` y `GET /social/feed` (dos recursos, mismo módulo — el mock ya los agrupaba en un solo repository).
- **`performance`** (stats/records/workouts/heatmap) es el caso especial: el mock generaba el heatmap con `Math.random()` en cada llamada y NINGUNO de los 4 métodos del repository recibía identidad de usuario — hoy no existe ningún flujo real que capture un entrenamiento en ningún app. Migrado tal cual (mismo contrato, sin personalizar por socio), pero con el heatmap ahora determinista (semillado fijo en `HeatmapCell`, mismo request → misma respuesta). Queda detrás de `CognitoAuthGuard` (no `@Public()`) porque conceptualmente es contenido de cuenta, aunque no filtre por `userId` todavía. **El día que exista captura real de entrenamientos, ese es el momento de agregarle `userId` a `Workout`/`PersonalRecord`/`PerformanceStat`/`HeatmapCell`, no antes** — ver comentario en `schema.prisma`.
- **`community`** (feed interno entre socios) SÍ es lógica real, a diferencia de los 3 anteriores: `CommunityPost`/`CommunityLike`/`CommunityComment` con relaciones a `User`. Sigue el mismo criterio de seguridad que `users/me` — `authorName`/`authorBranch` se resuelven en el service desde el usuario autenticado + su membresía actual (nunca del body, a diferencia del mock `createPost(email, authorName, authorBranch, body)`, que confiaba en el cliente). `toggleLike` es una fila (`CommunityLike`, `@@unique([postId, userId])`), no un contador — togglear es idempotente y `likeCount`/`likedByMe` se derivan en cada lectura, igual que `MembershipInfo.daysLeft`. Sin datos semilla: a diferencia del mock (3 posts de ejemplo con autores inventados), sembrar posts reales requeriría usuarios fantasma con emails que podrían chocar con cuentas reales de Cognito (`cognitoSub` no coincidiría, pero `email` sí es `@unique`) — el feed arranca vacío a propósito, se llena con usuarios reales.
- Unit tests: solo `community.service.spec.ts` (lógica real que vale la pena testear en aislamiento) — `announcements`/`social`/`performance` no tienen spec propio, mismo criterio que `branches`/`products` (passthrough puro, cubierto por e2e). E2E: los 4 dominios tienen cobertura en `test/app.e2e-spec.ts` (públicos vs. protegidos, seed counts, y para `community` un flujo de 2 usuarios completo: post → feed → like → unlike → comentario → 404 en post inexistente → 400 en comentario vacío).
- Tipos `SocialLink`/`FeedPost`/`Workout`/`PerformanceStat`/`PersonalRecord`/`HeatmapLevel` se movieron de `apps/customer-app/lib/types/{social,performance}.ts` a `@mucho-loco/types` (este backend los necesitaba también) — esos 2 archivos de `customer-app` quedaron como re-export para no tocar sus ~13 importadores.

`branch-app`/`owner-panel` no conectan aquí todavía (Fase 7 de la metodología) — sus mocks (inventario, corte de caja, nómina, asistencia, reportes) siguen siendo islas aisladas por app, a propósito, hasta que este backend cubra esos dominios también.

## Operación de sucursal y HQ (2026-09-12) — 10 dominios nuevos

Segunda gran tanda: los dominios que `branch-app` y `owner-panel` tenían como mocks aislados por app. Antes de esto, "el stock" existía tres veces (uno por app) y la asistencia que capturaba sucursal nunca llegaba a la nómina. Ahora hay una sola base, y eso desbloquea dos cruces que ningún mock podía montar:

- **Un pedido "recoger en gym" de la tienda aparece en la fila de mostrador**, se marca entregado ahí, y el socio lo ve entregado en su propio panel. Es el MISMO `Order`, no un modelo aparte.
- **La asistencia que ficha `branch-app` es la que paga la nómina de `owner-panel`.** `AttendanceSummary.daysWorked` dejó de ser un dato semilla: se cuenta de `AttendanceEntry` reales. Ese era el pendiente explícito de la Fase 3 en el CLAUDE.md raíz.

### Módulos

| Módulo | Rutas | Rol | Reemplaza |
|---|---|---|---|
| `inventory` | `branches/:id/inventory`, `inventory`, `inventory/global`, `inventory/transfers` | staff / owner | `counterSale.getInventory`, `stats.getGlobalInventory`, `inventoryTransfer.*` |
| `counter-sales` | `POST branches/:id/counter-sales` | staff | `counterSale.createSale` |
| `counter-memberships` | `branches/:id/member-access`, `members`, `memberships/renew`, `memberships/signup` | staff | `membership.*` de branch-app |
| `cash-register` | `branches/:id/cash-register/open-shift`, `history`, `cash-register/shifts/:id/{transactions,close}` | staff / manager | `cashRegisterShift.*` |
| `pickup-orders` | `branches/:id/pickup-orders`, `pickup-orders/:id/deliver` | staff | `pickupOrder.*` |
| `reports` | `branches/:id/reports/sales`, `stats/branches` | manager / owner | `reports.getSalesReport`, `stats.getBranchStats` |
| `attendance` | `attendance/open`, `branches/:id/attendance/{clock-in,today}`, `attendance/clock-out` | staff / manager | `attendance.*` |
| `payroll` | `payroll/{employees,periods,attendance,payslips}`, `payroll/periods/:id/run` | owner | `payroll.*` |
| `expenses` | `expenses` | owner | `expenses.*` |

### Roles (`auth/roles.decorator.ts` + `roles.guard.ts`)

`@Roles('staff'|'manager'|'owner')` sobre un handler o un controller. El guard es global y corre DESPUÉS de `CognitoAuthGuard`, así que solo decide, nunca autentica. Los roles son **jerárquicos** (staff < manager < owner): el dueño puede hacer lo de un gerente y lo de mostrador, así que no hay que listar los tres grupos en cada ruta de sucursal. Un socio autenticado sin grupo recibe 403 (no 401) en cualquier ruta interna.

### Decisiones que NO son fieles al mock, a propósito

1. **El precio de una membresía lo pone la sucursal que cobra — hoy solo para `single`.** El mock de branch-app tenía `CURRENT_BRANCH_PRICE = 1090` fijo, así que Coyoacán ($890) y Santa Fe ($1390) cobraban precio de Roma Sur. `all` dejó de seguir esta regla el 2026-09-15: es precio fijo en cualquier sucursal (ver "Membresías con Stripe Billing" abajo).
2. **`User.cognitoSub` y `User.email` son nullables.** Un socio dado de alta en mostrador (con huella o solo su nombre) no tiene cuenta en la app ni necesariamente correo. Ser socio y tener login son cosas distintas.
3. **`Employee.email`** se agregó al tipo compartido: es la llave que cruza asistencia con nómina. Sin ella los dos módulos siguen siendo islas.
4. **`BranchInventoryLevel.productName`/`unitPrice` no se guardan**, se resuelven del catálogo al leer — un cambio de precio no puede dejar copias viejas en 15 sucursales. El nombre se arma siempre igual (`name · flav`); los mocks lo escribían a mano, a veces con sabor y a veces sin.
5. **`ShiftTransaction` gana `kind: 'pickup'`.** El efectivo de un pedido recogido entra al cajón de esa sucursal, así que el corte tiene que verlo — contado por `deliveredAt`, no por cuándo se hizo el pedido. Uno pagado con tarjeta en línea no entra: nunca tocó esa caja.
6. **`BranchStatsSummary` se deriva.** El mock devolvía cuatro filas escritas a mano (`revenue: 186400`); aquí sale de transacciones reales, así que los números arrancan chicos. Socios en periodo de gracia cuentan como activos: siguen entrando al gimnasio.
7. **Fechas en ISO**, nunca texto pre-formateado en español (`MemberAccessRecord.expiresAt`, `Employee.hireDate`, `Expense.date`). Mismo criterio que ya seguía `MembershipInfo`.

### Invariantes que NO viven solo en el código

Dos índices únicos **parciales**, escritos a mano en `20260912090000_branch_ops_and_hq/migration.sql` porque Prisma no sabe declararlos:

- `cash_register_shifts_one_open_per_branch` — `WHERE status = 'open'`.
- `attendance_entries_one_open_per_staff` — `WHERE "clockOut" IS NULL`.

Sin ellos, dos requests simultáneos abrirían dos turnos. `getOpenShift` incluso maneja la carrera: si su insert pierde, relee y devuelve el turno que ganó.

### Zona horaria

Hay lógica que depende de qué día es "hoy" en la sucursal (asistencia del equipo, agrupación por día de los reportes). El `Dockerfile` fija `TZ=America/Mexico_City`; correr el contenedor en UTC haría que a partir de las 18:00 locales el gerente viera el día siguiente. Los límites de un PERIODO de nómina, en cambio, se calculan en UTC — `startDate`/`endDate` se guardan como fecha sola y mezclarlas con horas locales recortaba seis horas del último día.

### Cálculo de nómina

`payroll/payroll.math.ts` es gemelo de `owner-panel/src/lib/payroll.ts` (tablas de ISR/IMSS **ilustrativas, no las reales del SAT/IMSS**). La diferencia importa: aquí el recibo se emite y se **guarda**, con nombre, sucursal, puesto y sueldo congelados — un recibo es un documento histórico, no algo que se recalcule cada vez que alguien abre la pantalla. Cuando `owner-panel` conecte a este backend, su copia se borra. `daysWorked` cuenta **días distintos con turno cerrado**, no turnos: entrar y salir dos veces el mismo día es un día trabajado.

## Pagos con Stripe (2026-09-12)

Cobro con pasarela para los pedidos de la tienda. Módulo `payments`, dos endpoints:

| Ruta | Quién la llama |
|---|---|
| `POST /payments/checkout-sessions` | El socio (autenticado). Crea el pedido en `pending_payment` y devuelve la URL de Stripe. |
| `POST /payments/stripe/webhook` | Stripe. `@Public()` por necesidad; lo protege la FIRMA, no un token. |

### Decisiones (siguen la skill `stripe-best-practices` instalada)

- **Checkout Sessions, no PaymentIntents.** Es lo recomendado para un pago único on-session: maneja descuentos, envío y métodos de pago dinámicos sin código extra.
- **Nunca se pasa `payment_method_types`.** Omitirlo activa los métodos de pago dinámicos: Stripe decide qué ofrecerle a cada socio según país, monto y dispositivo. Fijarlo a `['card']` apagaría eso y bajaría la conversión — y en México importa (OXXO, SPEI).
- **El pedido se guarda ANTES de mandar al socio a pagar.** Si se creara al volver, alguien que paga y cierra la pestaña habría pagado sin pedido.
- **La entrega la dispara el WEBHOOK, nunca la página de éxito.** Un socio puede pagar y perder la conexión antes de que cargue; ese pedido se quedaría sin surtir para siempre.
- **`checkout.session.completed` no basta.** Con métodos de notificación diferida (OXXO, transferencia) ese evento llega con la sesión todavía `unpaid`. Se exige `payment_status !== 'unpaid'` y se escucha también `async_payment_succeeded` / `async_payment_failed`.
- **Idempotencia.** Stripe reentrega el mismo evento ante cualquier duda. `providerSessionId` es `@unique` y `markPaid` no hace nada si el pago ya estaba en `paid`.
- **Cuerpo crudo.** `NestFactory.create(AppModule, { rawBody: true })`: la firma se calcula sobre los bytes exactos, y volver a serializar el JSON parseado la rompe siempre.
- **Centavos.** El catálogo guarda pesos enteros y Stripe cobra en la unidad mínima — $1290 son 129000. Sin la conversión se cobraría $12.90.
- **Modelo `Payment` aparte de `Order`.** Son ciclos de vida distintos: un pedido puede acumular varios intentos (el socio abandona el checkout y vuelve), y deja lugar para PayPal y Mercado Pago sin volver a tocar `Order`.

### Probado contra Stripe real (2026-09-12) ✅

Flujo completo ejercido de punta a punta contra un sandbox real, no contra mocks:

1. Token real de Cognito (`initiate-auth` con `diego@mucholoco.mx`) → `POST /payments/checkout-sessions`.
2. Stripe devolvió una sesión real; el pedido quedó en `pending_payment` con `total: 2580` **calculado por el servidor** (1290 × 2), no por el cliente.
3. Pago completado en la página hospedada de Stripe con la tarjeta de prueba `4242…`, manejando el navegador con Playwright (no hay API para "pagar" una sesión de Checkout — es una página de Stripe).
4. Stripe redirigió a `successUrl` con el `session_id`, y entregó `checkout.session.completed` vía `stripe listen`.
5. El backend verificó la firma REAL, respondió 200, y el pedido pasó a `ready` con `providerPaymentIntentId` guardado.
6. Una firma inventada contra el mismo verificador real devolvió **400**.

Un hallazgo del ejercicio: el aviso de WhatsApp se omitió con `Socio ... sin teléfono`. La auto-provisión desde Cognito deja `phone` vacío porque el registro de `customer-app` no lo pide — **el canal de avisos no puede funcionar hasta que el signup capture teléfono**. Está anotado abajo.

Para repetirlo:

```bash
npm i -g @stripe/cli
stripe sandbox create           # llaves de prueba, sin registrarse
# poner STRIPE_SECRET_KEY en apps/backend/.env
stripe listen --forward-to localhost:3001/payments/stripe/webhook
# el comando imprime STRIPE_WEBHOOK_SECRET — ponerla también en .env
stripe trigger checkout.session.completed
```

Sin esas dos variables el resto del backend funciona igual; solo `/payments/*` falla al usarse.

### Pendiente

- **El registro web no pide teléfono.** mobile-app sí (desde 2026-09-12): lo manda como `phone_number` y `findOrCreateByCognito` lo guarda (ver "Auth" abajo). Falta lo mismo en `SignupForm` de customer-app — que además pide cumpleaños y nunca lo manda a Cognito.
- **PayPal y Mercado Pago.** El modelo `Payment` ya tiene `provider`, así que agregarlos es un módulo más, no un rediseño. Hay skill oficial de PayPal instalada; para Mercado Pago no hay y se diseña directo con el usuario.
- ~~**Membresía recurrente.**~~ ✅ Hecho (2026-09-13) — ver "Membresías con Stripe Billing" abajo.
- **Reembolsos.** `providerPaymentIntentId` se guarda justo para eso, pero no hay endpoint todavía (y la política de devoluciones sigue sin decidirse — ver "Pendiente de decidir" en el CLAUDE.md raíz).

## Dirección de envío (2026-09-14)

Los pedidos a domicilio se creaban **sin dirección**: el checkout web la pedía y nunca la mandaba. Ahora `CreateOrderDto` y `CreateCheckoutSessionDto` exigen `address` (`ShippingAddressDto`: calle, colonia, alcaldía o municipio, estado, CP de 5 dígitos, teléfono en E.164 y referencias opcionales) cuando `delivery = 'home'`, y la ignoran al recoger. En el cable `delivery` sigue siendo el string y la dirección va aparte; en el contrato de customer-core es la unión `OrderDelivery`.

- Se guarda como JSON en `orders.shippingAddress` (migración `20260914120000_order_shipping_address`): una copia congelada, así un pedido viejo no cambia de destino si el socio se muda. Vuelve en `Order.shippingAddress`.
- Con Stripe también va a `payment_intent_data.shipping`: Radar (el antifraude) la usa y queda junto al cobro en el dashboard.
- Sin dirección → 400 del DTO; `ADDRESS_REQUIRED` si alguien llama al service sin pasar por él.

## Solo Stripe + efectivo (2026-09-14)

`POST /users/me/orders` aceptaba `card`, `transfer`, `mercadopago` y `paypal` y creaba el pedido **como pagado sin cobrar nada** — se podía recoger en mostrador sin pagar. Ahora `CreateOrderDto` solo acepta `cash` (`OfflinePaymentMethod`), solo al recoger, y el pedido nace `pending_payment`: lo cobra mostrador. Todo lo demás, incluido todo pedido a domicilio, entra por `POST /payments/checkout-sessions`, y solo el webhook de Stripe lo deja `ready`. Stripe cubre tarjeta, OXXO y SPEI con los métodos de pago dinámicos (activarlos en el dashboard; OXXO y SPEI son de notificación diferida y ya se manejan con `async_payment_succeeded`).

## Envíos a domicilio — bodega (2026-09-14)

Módulo `shipments`, solo rol `owner` (la bodega central la opera HQ; no existe un rol de bodega):

| Ruta | Qué hace |
|---|---|
| `GET /shipments` | Pedidos a domicilio **cobrados** (`ready`/`shipped`/`done`), el más viejo primero, con nombre del socio y dirección. `pending_payment` no aparece: mandarlo sería regalarlo. |
| `POST /shipments/:id/ship` | `ready` → `shipped`, con `trackingNumber` opcional y `shippedAt`. |
| `POST /shipments/:id/deliver` | `shipped` → `done`, con `deliveredAt`. |

Estado nuevo `shipped` en `OrderStatus` (migración `20260914130000_order_shipment_tracking`, que además agrega `shippedAt` y `trackingNumber`). Errores con código: `ORDER_NOT_PAID`, `ORDER_ALREADY_SHIPPED`, `ORDER_NOT_SHIPPED`, `ORDER_ALREADY_DELIVERED`, `NOT_A_HOME_ORDER`. El socio ve `shipped` y la guía en `GET /users/me/orders`. e2e en `test/branch-ops.e2e-spec.ts` ("shipments (tienda → bodega)").

**Pendiente**: aviso de WhatsApp "tu pedido va en camino" (necesita una plantilla aprobada por Meta), y un rol de bodega si algún día la opera alguien que no sea el dueño.

## Membresías con Stripe Billing (2026-09-13)

Antes: todo socio nuevo nacía con una mensual de 15 sucursales **regalada**, `retry-payment` "cobraba" sin tocar pasarela, y nada pasaba una membresía a `grace`/`expired` — una vencida abría la puerta para siempre. Ahora la membresía existe desde su primer cobro confirmado.

| Ruta | Qué hace |
|---|---|
| `POST /payments/membership-checkout-sessions` | Contratar o renovar. Body = sucursal + tier + periodo (+ `lang` y URLs), **nunca importe**. Visita = `mode: 'payment'`; semanal/mensual/trimestral/anual = `mode: 'subscription'`. |
| `POST /payments/membership-invoice` | En gracia: la `hosted_invoice_url` de la factura que falló, para pagarla con otra tarjeta. |
| `GET /users/me/membership` | 404 = todavía no contrata (el cliente HTTP lo lee como `null`, `getOrNull`). |

Se quitó `POST /users/me/membership/retry-payment`. Código: `payments/membership-billing.service.ts` (Stripe) y `memberships/` (dominio: `grant`, `enterGrace`, `detachSubscription`, `expireLapsed`).

### Reglas

- **El estado lo decide Stripe.** Ningún evento se aplica tal cual llega: `syncSubscription` vuelve a leer la suscripción y copia su estado — `active`/`trialing` → activa hasta el fin del periodo; `past_due` → gracia de 7 días (`GRACE_DAYS`); `canceled`/`unpaid` → se desliga y vale hasta `expiresAt`. Stripe no garantiza el orden de los eventos (la factura pagada puede llegar antes que la sesión completada); leer el estado fresco hace que no importe y que reprocesar no cambie nada. Con API `dahlia` el periodo vive en `items.data[].current_period_end` y la factura liga su suscripción en `parent.subscription_details`.
- **De quién es** viaja en `subscription_data.metadata` (userId, branchId, tierKey, periodKey): los eventos de renovación de meses después solo traen la suscripción.
- **Vencimiento en un solo lugar**: `memberships/membership-status.ts` (`effectiveStatus`). Se aplica al LEER (panel del socio y check-in de sucursal, así una membresía deja de abrir la puerta al momento en que vence) y un cron cada hora (`expireLapsed`) lo persiste para reportes y avisos. Con suscripción se toleran 3 días de retraso del webhook de renovación.
- **Precio del servidor**: `calculateMembershipPrice(branch.price, tier, periodo)` — `membership-plans.ts` se movió de `counter-memberships/` a `memberships/`. Un Product de Stripe por tier con id fijo (`ml_membership_single`/`ml_membership_all`, se crea solo la primera vez); el precio va en `price_data` de cada sesión. Para `single` sigue dependiendo de la sucursal (`branch.price × factor`); **`all` es precio fijo desde 2026-09-15** (`TIER_BASE_PRICES`, ver CLAUDE.md raíz, "Membresía y alcance de acceso") — `branch.price` se sigue recibiendo pero `calculateMembershipPrice` lo ignora para ese tier. `price_data` dinámico se mantuvo para los dos (en vez de crear un Price fijo de Stripe para `all`) para no complicar la integración por un tier — el número que sale simplemente deja de moverse.
- **No cobrar dos veces**: 409 `ALREADY_SUBSCRIBED` con una suscripción viva. Si contrata desde gracia o suspendido, la suscripción vieja se cancela ANTES de ligar la nueva. Visita encima de una membresía vigente → 409 `MEMBERSHIP_STILL_ACTIVE`.
- **Renovar antes no pierde lo pagado**: si le quedan más de 3 días (pagados en mostrador, por ejemplo), `trial_end` = ese día y el primer cobro cae ahí.
- **Visita idempotente**: la tabla nueva `MembershipPurchase` se marca pagada y la membresía se da en UNA transacción — un evento reentregado no suma otro día.
- Tras el primer cobro se fija `payment_settings.save_default_payment_method: 'on_subscription'`: la tarjeta con la que se paga una factura atrasada queda para las renovaciones.
- Los avisos de WhatsApp "por vencer" ya no se mandan a quien tiene suscripción (Stripe le cobra solo).
- "Recoger en gym" sin membresía → 400 `PICKUP_REQUIRES_MEMBERSHIP` (antes funcionaba solo porque todos tenían la regalada). Comunidad sí deja publicar sin membresía (el post sale sin sucursal).

### Configurar en Stripe antes de probarlo de verdad

- El webhook (o `stripe listen`, que sin `--events` reenvía todo) necesita: `checkout.session.completed`, `checkout.session.async_payment_succeeded`/`_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`/`updated`/`deleted`.
- Billing → recuperación de ingresos: Smart Retries y qué hacer al agotar reintentos (recomendado: cancelar la suscripción). Nuestra gracia de 7 días es independiente: si Stripe logra cobrar después, `invoice.paid` la reactiva.

### Probado

Unit (`membership-billing.service.spec.ts`, `membership-status.spec.ts`, `memberships.service.spec.ts`) y e2e contra Postgres real con Stripe sobreescrito — `test/membership-billing.e2e-spec.ts` recorre el ciclo completo: sin membresía → contrata → activa → falla la renovación → gracia → paga la factura → activa → un evento viejo reentregado no la regresa → cancela → vence → compra una visita.

### Probado contra el sandbox de Stripe (2026-09-13) ✅

Backend local + `stripe listen` + Postgres dev. Sin User Pool vivo no hay token para el endpoint, así que el checkout se abrió con el `MembershipBillingService` real desde un script en contexto de Nest, y se pagó en la página hospedada de Stripe con `4242…` manejando el navegador con Playwright.

1. **Visita (15 sucursales)**: Stripe aceptó el checkout en `mode: 'payment'` (`customer_creation`, `payment_intent_data`, producto con id fijo). `checkout.session.completed` → activa 24 h, `autoRenews: false`, compra `paid` por $200, cliente de Stripe guardado.
2. **Mensual (1 sucursal)**: suscripción real con la metadata del socio, `ml_membership_single`, 109000 centavos/mes y `save_default_payment_method: on_subscription`. `expiresAt` = el fin de periodo de Stripe, exacto.
3. **Renovación que falla**: tarjeta `pm_card_chargeCustomerFail` como default + subida de precio con `proration_behavior: always_invoice` → factura `subscription_update` rechazada → `past_due` → `invoice.payment_failed` → gracia de 7 días.
4. **Pagar el atraso**: `openPendingInvoice` devolvió la página de la factura abierta. Pagarla ahí con Playwright no se pudo (la página de facturas trae hCaptcha y Link, y en headless el clic no llega a procesarse), así que se pagó por API con una tarjeta nueva → `invoice.paid` → activa, gracia borrada, y Stripe dejó la tarjeta NUEVA como la de renovaciones.
5. Segunda contratación con la suscripción viva → 409 `ALREADY_SUBSCRIBED`.
6. **Cancelar** en Stripe → `customer.subscription.deleted` → sin suscripción, activa hasta el fin del periodo pagado, `autoRenews: false`.

46 eventos reenviados, los 46 respondidos 200, sin warnings. Clientes y socios de prueba borrados; los Products `ml_membership_single`/`ml_membership_all` se quedan en el sandbox (el código los reusa).

**Lo que no se pudo probar**: la renovación natural al terminar el periodo. La llave de `.env` es de un sandbox **reclamable**, con permisos limitados, y no puede crear test clocks (ni con la CLI, que usa la misma llave). Para probarla: "Claim sandbox" en el dashboard de Stripe → llave completa → test clocks.

### Pendiente

- **Portal de cliente de Stripe** (cambiar plan, actualizar tarjeta, cancelar): hoy el socio no puede cancelar desde la app.
- `branch-app` renovando en mostrador a un socio con suscripción viva le cobraría dos veces — el mostrador no sabe de la suscripción.
- ~~Los reportes de `owner-panel` no suman las membresías cobradas en línea~~ — ✅ resuelto (2026-09-14): los reportes leen el registro de cobros, ver abajo.
- Al recrear el User Pool, diego/valeria entran SIN membresía (el seed no crea membresías): se contrata con la tarjeta `4242…`.

## Registro de cobros (2026-09-14) — paso 1 de facturación

Antes de emitir un solo CFDI hace falta saber, en UN lugar, cada peso que entró. El dinero vivía en cuatro tablas con formas distintas (`Payment`, `CounterSale`, `MembershipPayment`, `MembershipPurchase`), y una parte ni siquiera llegaba a una tabla: **los cobros de suscripción del mes 2 en adelante no dejaban fila en ningún lado** — `invoice.paid` solo movía `expiresAt`. Ahora cada cobro confirmado es una fila de `Charge` (con sus `ChargeLine`), venga del canal que venga. Las tablas de cada canal siguen siendo el detalle operativo.

| Canal | Quién lo registra | `paidAt` | `method` |
|---|---|---|---|
| Pedido pagado en línea | `PaymentsService.markPaid` (webhook) | `event.created`: con OXXO/SPEI, el día que Stripe confirmó el dinero | del cargo del PaymentIntent |
| Pedido en efectivo al recoger | `PickupOrdersService.markDelivered` | al entregar | `cash` |
| Venta de mostrador | `CounterSalesService.createSale` | `createdAt` de la venta | el de mostrador |
| Membresía de mostrador | `CounterMembershipsService.renew`/`signUp` | `createdAt` del pago | el de mostrador |
| Visita en línea | `MembershipBillingService.completeCheckout` | `event.created` | del PaymentIntent |
| Cada cobro de suscripción | `MembershipBillingService`, en `invoice.paid` | `status_transitions.paid_at` | InvoicePayment → PaymentIntent |

### Decisiones

- **Un solo escritor**: `ChargesService` (`src/charges/`). Cada canal lo llama DENTRO de la transacción que confirma su cobro: no existe un pedido pagado sin su cobro, ni el cobro de una venta que se revirtió. Cuando llegue el outbox del PAC (paso 2), se agrega ahí, en un solo lugar.
- **Exactamente un origen**: `orderId`/`counterSaleId`/`membershipPaymentId`/`membershipPurchaseId`/`stripeInvoiceId`, todos `@unique`, más el CHECK `charges_exactly_one_source` escrito a mano en `20260914150000_charges_ledger` (Prisma no sabe declararlo). Los FKs de origen son `Restrict`: no se borra lo que originó un ingreso — por eso los e2e borran `charge` antes que pedidos, ventas o compras.
- **Idempotente sin abortar la transacción**: `createMany({ skipDuplicates: true })` (ON CONFLICT DO NOTHING). Un `create` que choca con el índice único aborta la transacción ENTERA en Postgres, y un webhook reentregado haría fallar todo lo demás.
- **Suscripciones solo por `invoice.paid`**, el primer cobro incluido. El primero también llega como `checkout.session.completed`; registrarlo por los dos lados lo contaría dos veces. Una factura en $0 (renovación adelantada con `trial_end`) no cobró nada y no se registra. El plan sale de `parent.subscription_details.metadata` (congelada en la factura), con la suscripción como respaldo.
- **Centavos** en `Charge`/`ChargeLine`; el resto del schema sigue en pesos y `toCents` convierte al registrar. El desglose de IVA (total / 1.16) da decimales.
- **Renglones con dato fiscal congelado**: `TaxCategory` es el catálogo fiscal, separado del comercial (`Product.taxCategoryId`, `MembershipTier.taxCategoryId`), y al cobrar se copia al renglón (`satProductKey`, `satUnitKey`, `taxRateBp`). Si los renglones no suman el total, `insert` truena — una factura lo exige, y mejor enterarse al registrar que al timbrar. El envío es renglón propio (`shipping`), calculado como total − productos.
- **`OrderItem.productId`/`unitPrice`** (nuevos): el precio se congela al hacer el pedido, porque el cobro puede llegar días después. Un pedido anterior a esos campos va como un renglón `unclassified` por su total.
- **`ChargeMethod` guarda lo que pasó, no la clave del SAT**: traducir a `c_FormaPago` es del paso 2. Mostrador registra `card` a secas porque su terminal no captura crédito vs débito todavía.
- **Los reportes leen `Charge`** (`reports.service.ts`): ya suman membresías contratadas en línea y pedidos pagados en línea (al pagarse, no al entregarse). "Más vendidos" sigue saliendo solo de ventas de mostrador. `cash-register` no cambió: el corte de caja es sobre el cajón, no sobre ingresos.

**Claves fiscales provisionales.** Todas las categorías traen `01010101` ("No existe en el catálogo": válida pero genérica); la real la define el contador antes de la primera factura. Categorías: `supplement`, `energy_drink` (aparte porque las bebidas energizantes llevan IEPS además de IVA — confirmar con el contador), `beverage`, `merch`, `gym_membership`, `shipping`, `unclassified`. Van en la migración (las columnas nuevas son NOT NULL sobre filas existentes) y en `seed.ts`.

Probado: unit (`charges.service.spec.ts` + el spec de cada canal) y e2e contra Postgres real — cada canal deja su cobro con renglones, un webhook reentregado (pedido, visita, `invoice.paid`) no duplica, y el reporte de sucursal suma exactamente lo que el registro tiene para ella.

### Pendiente

- ~~**Paso 2**: emitir CFDI.~~ ✅ Backend (2026-09-15), con un solo RFC para las 15 sucursales — ver "Facturación CFDI" abajo.
- Mostrador: capturar crédito vs débito (el SAT los distingue: 04 vs 28).
- ~~Hueco: mostrador podía entregar un pedido de Stripe en `pending_payment` (checkout abandonado).~~ ✅ Corregido (2026-09-15): `getByBranch` ya no lista pedidos en línea sin pagar, y `markDelivered` los rechaza con `ORDER_NOT_PAID`, como `shipments`. El efectivo pendiente se sigue entregando: ahí es donde se cobra. e2e en `branch-ops.e2e-spec.ts`.

## Facturación CFDI (2026-09-15) — paso 2

Un solo RFC para las 15 sucursales (CLAUDE.md raíz) → una organización de Facturapi, una llave (`FACTURAPI_KEY`), un certificado (CSD). Módulo `invoicing`. Todo lo que se factura sale del registro de cobros de arriba.

### Cómo fluye

1. Cada `Charge` nace con su `FiscalReceipt` en `pending`, en la misma transacción (`ChargesService.insert`). El cobro nunca llama al PAC: un Facturapi caído no tumba una venta de mostrador ni un webhook de Stripe.
2. `FiscalReceiptsService` (cron cada minuto, nombre `fiscal-receipts`) toma hasta 20 pendientes y los da de alta en Facturapi como **recibo** (`receipts.create`, `idempotency_key` = id del cobro). Si falla: reintento con backoff de 2ⁿ minutos (tope 6 h); a los 10 intentos queda `failed`, y HQ lo ve en `/invoicing/summary`.
3. El recibo trae `key` y `selfInvoiceUrl` (el portal de autofactura de Facturapi, `factura.space/<dominio>/<clave>`): el ticket de mostrador los imprime y el cliente se factura ahí, sin cuenta en la app. No hace falta página `/facturar` propia.
4. El socio con app factura desde "Facturar": `POST /users/me/charges/:id/invoice` convierte su recibo en CFDI (`receipts.invoice`) con sus datos fiscales guardados. Si llega antes que el worker, el recibo se da de alta en ese momento.
5. Lo que nadie facturó entra solo a la **factura global** que Facturapi emite al cierre del periodo (se configura una vez en su panel: periodicidad mensual + factura global automática). Llega por webhook.
6. Webhook `POST /invoicing/facturapi/webhook` (público; firma en `facturapi-signature`, verificada con `FACTURAPI_WEBHOOK_SECRET` por el SDK): autofacturas del portal, cambios de estado de recibos, factura global y cancelaciones. Mismo criterio que Stripe: no se aplica el evento, se vuelve a leer el recibo o la factura.

| Endpoint | |
|---|---|
| `GET`/`PUT /users/me/fiscal-profile` | Datos fiscales: RFC, razón social, régimen, CP, uso de CFDI, correo. 404 `FISCAL_PROFILE_NOT_FOUND` si no hay. Solo se valida la forma; el SAT valida el resto al timbrar. |
| `GET /users/me/charges` | Sus cobros de cualquier canal, con `invoice.status`: `available` / `invoiced` / `closed` (ya en la global) / `unavailable`. |
| `POST /users/me/charges/:id/invoice` | Emite su CFDI. Facturapi le manda PDF y XML por correo. |
| `GET /users/me/invoices/:cfdiId/pdf` (o `xml`) | Solo facturas individuales suyas — pedidas en la app o en el portal con un ticket de un cobro suyo. |
| `GET /invoicing/cfdis`, `/invoicing/summary`, `/invoicing/cfdis/:id/pdf` | Dueño. |
| `POST /invoicing/cfdis/:id/cancel` | Dueño. Motivos `02` y `03`; `01` (con sustitución) y `04` todavía no. |

### Decisiones

- **Recibos y no facturas directas.** El modelo de recibos de Facturapi resuelve de un jalón la autofactura del ticket y la factura global de lo no facturado. Hacer la global a mano es armar `InformacionGlobal` y excluir lo ya facturado — justo lo que el PAC ya hace.
- **El recibo ES la cola (outbox)**, sin tabla genérica. Tomar y arrendar es una sola sentencia (`UPDATE … WHERE "chargeId" IN (SELECT … FOR UPDATE SKIP LOCKED) RETURNING`): dos instancias de ECS nunca toman el mismo, y la llamada a Facturapi va FUERA de la transacción — el arriendo son 5 minutos en `nextAttemptAt`.
- **`now() AT TIME ZONE 'UTC'`** en ese SQL, no `now()`: Prisma guarda UTC en columnas sin zona, y una sesión en hora de México compararía 6 h corrido. Por lo mismo `ChargesService` escribe `nextAttemptAt` explícito en vez de dejar el default de la base. El e2e lo prueba en los dos sentidos: un recibo nuevo se toma, uno en espera no.
- **Lugar de expedición = domicilio de la matriz** (el de la organización en Facturapi). El SAT acepta "matriz o sucursal", y así no hay que dar de alta 15 sucursales en el PAC. El recibo no manda `branch`.
- **Forma de pago** (`PAYMENT_FORM`): efectivo `01` (OXXO también: el cliente paga en efectivo), SPEI/transferencia `03`, crédito `04`, débito `28`. `card` sin distinguir (mostrador) va como `04` — provisional hasta capturar crédito vs débito.
- **Si el PAC rechaza, primero se pregunta por qué.** Un 4xx al facturar relee el recibo: si ya se autofacturó en el portal o entró a la global, responde ese conflicto (409); solo si sigue abierto es culpa de los datos — 422 `FISCAL_DATA_REJECTED` con el motivo del SAT tal cual, que es lo que el socio tiene que corregir.
- **Sin backfill**: los cobros anteriores a la migración no tienen recibo (`unavailable`). Darlos de alta hoy los fecharía en este mes, y su ingreso pertenece a otro periodo.
- **Conceptos** = los renglones del cobro con su clave del SAT congelada, precio con IVA incluido (`tax_included: true`) e IVA a la tasa del renglón. IEPS, cuando el contador lo confirme.
- **El PDF y el XML no se guardan**: viven en Facturapi y se piden al descargar.

Probado: unit (`fiscal-mapping`, `fiscal-receipts.service`, `invoicing.service`) y e2e contra Postgres real con Facturapi sobreescrito (`test/invoicing.e2e-spec.ts`): cobro → cola → el worker lo manda una vez (y si el PAC no contesta, espera su turno) → datos fiscales → factura → nunca dos veces, nunca la de otro → un recibo pendiente se da de alta al facturar → webhook con firma mala da 400 → la global cierra lo no facturado → cada quien descarga lo suyo → el dueño lista, cuenta, cancela, y el cobro vuelve a quedar facturable.

**Sin probar contra Facturapi** — no hay cuenta todavía. Por verificar en su sandbox:
- el nombre de la cabecera de la firma (`facturapi-signature`);
- si al emitir la global Facturapi manda `receipt.status_updated` por cada recibo. Si no, el recibo local sigue `open` hasta que alguien intenta facturarlo — entonces se relee y responde `INVOICING_WINDOW_CLOSED`;
- que el recibo acepte los conceptos en línea, sin productos dados de alta en Facturapi.

### Pendiente

- ~~Frontend de `customer-app`~~ ✅ (2026-09-23, ver "Facturar (CFDI)" en su CLAUDE.md). Para eso `GET /users/me/charges` ganó `invoice.uuid` (folio del SAT; solo con `invoiced`, `null` en `closed` porque ese CFDI es la global) — el socio lo manda por WhatsApp y HQ busca con él.
- ~~Frontend de `mobile-app`~~ ✅ (2026-09-24, ver "Facturar (CFDI)" en su CLAUDE.md).
- ~~Frontend de `branch-app`~~ ✅ (2026-09-24): `GET /branches/:branchId/tickets/:kind/:sourceId` (`kind` = `sale` | `membership`, `sourceId` = el id de la venta o pago, el mismo de `ShiftTransaction.id`) arma el ticket desde el registro de cobros con `selfInvoice` (`pending`/`ready`/`invoiced`/`unavailable`; sin llave de Facturapi un `pending` se reporta `unavailable`). `@Roles('staff')`; otra sucursal → 404 `TICKET_NOT_FOUND`. e2e en `test/tickets.e2e-spec.ts`.
- ~~Frontend de `owner-panel`~~ ✅ (2026-09-24, `/invoicing`): para exportar el mes completo, `GET /invoicing/cfdis` acepta `?month=YYYY-MM` (hora de CDMX vía `mexicoMonthRange`, sin el tope de 200; 400 si el mes no es válido).
- Cuenta de Facturapi: organización, CSD, domicilio fiscal de la matriz, periodicidad de la global, alta del webhook.
- Contador: claves SAT reales, IEPS, y el plazo para facturar (es la vigencia del recibo en Facturapi).
- Cancelación con sustitución (motivo `01`) y notas de crédito, cuando exista la política de devoluciones.

## Notificaciones por WhatsApp (2026-09-12)

Avisos por WhatsApp Business Platform (Cloud API de Meta) — se eligió sobre email porque es el canal dominante en México (ver CLAUDE.md raíz). Módulo `notifications`.

### Qué se avisa y qué lo dispara

| Aviso | Disparador |
|---|---|
| `payment_confirmed` | El webhook de Stripe, al confirmar el cobro. |
| `order_ready` | El mismo, pero solo si la entrega es "recoger en gym". |
| `membership_expiring` | Cron diario, a 7 / 3 / 1 días del vencimiento. |
| `membership_grace` | Cron diario, mientras el socio esté en periodo de gracia. |

### Decisiones

- **Plantillas aprobadas, no texto libre.** Fuera de la ventana de 24h desde el último mensaje del socio, Meta solo deja enviar plantillas registradas. Por eso cada aviso nombra una plantilla y manda parámetros posicionales; los nombres (`membresia_por_vencer`, etc.) tienen que existir en Meta Business.
- **Idempotencia en la base, no en el código.** `Notification` con `@@unique([userId, kind, dedupeKey])`. Sin eso, el barrido diario le manda al socio el mismo "vence en 3 días" cada vez que corre. La llave es la **fecha de vencimiento**, no los días restantes: así los tres avisos (7/3/1) comparten llave y el socio recibe UNO por ciclo. Si renueva, la fecha cambia y el siguiente ciclo vuelve a avisar.
- **Un aviso que falla no tumba lo que lo disparó.** `notifyOnce` nunca tira: registra `status: 'failed'` y sigue. El envío ocurre DESPUÉS de escribir el pedido y fuera de la transacción — un WhatsApp caído no puede revertir un cobro que sí ocurrió. El fallo se guarda también para que el cron no reintente en bucle contra un número roto.
- **Un cron y no un evento** para las membresías: "vencer" no es algo que alguien haga: nadie hace clic el día que a un socio le quedan 3 días. Corre a las 9am de CDMX (`TZ` del contenedor) — mandar avisos de cobro a las 3am sería hostil.
- **`@nestjs/schedule` fijado en v4.** La v12 es ESM-only y rompe Jest con el mismo error que ya obligó a quedarse en Prisma 6 (ver esa decisión abajo). La v4 es CommonJS y no necesita configuración especial.
- **Teléfonos normalizados a E.164 sin `+`.** El seed los tiene como `"+52 55 1234 5678"` y Meta responde 400 sin explicar por qué; `normalizePhone` los limpia y le antepone 52 a un número mexicano de 10 dígitos.
- **El webhook responde 200 incluso a una firma inválida.** Meta desactiva un webhook que responde errores de forma sostenida, así que alguien mandando basura no debe poder tirarnos el canal. El evento simplemente se descarta. (Distinto de Stripe, que sí quiere un 400: ahí un 5xx provoca reintentos.)

### Limitación conocida: el cron corre en cada instancia

Es un cron **en proceso**. Con `desired_count = 1` en ECS (lo que hay hoy) está bien; con dos tareas, el barrido corre dos veces. El índice único evita el aviso duplicado, así que el daño está acotado, pero la solución correcta al escalar es sacarlo del proceso: EventBridge Scheduler pegándole a un endpoint, o una tarea programada de ECS.

### Probarlo de verdad

Como con Stripe, el código está completo y testeado (17 unit + 8 e2e) pero **nunca se ha ejercido contra Meta**. Hace falta: una app en Meta for Developers con el producto WhatsApp, un número de prueba, las plantillas dadas de alta y aprobadas, y las cuatro variables de `.env.example`. El webhook necesita una URL pública — en local, un túnel (`ngrok`, `cloudflared`).

## Decisión importante: Prisma 6, no Prisma 7 (2026-09-11)

Se empezó con Prisma 7 (generator `prisma-client` + driver adapter `@prisma/adapter-pg` + `prisma.config.ts`) siguiendo la skill `prisma-database-setup` instalada en este proyecto, que documenta ese como el flujo "actual". **Se revirtió a Prisma 6 clásico** (`prisma-client-js`, sin driver adapter, `url = env("DATABASE_URL")` directo en `schema.prisma`) tras dar con dos problemas de fondo, no triviales de resolver:

1. El cliente generado de Prisma 7 usa imports con extensión `.js` explícita sobre archivos `.ts` (convención Node16/NodeNext/ESM) — rompe con `ts-node`/Jest en modo CommonJS por defecto (`Cannot find module './internal/class.js'`). Se puede parchear (`tsx` en vez de `ts-node`, `moduleNameMapper` en Jest), pero es fricción evitable.
2. Más grave: el query engine de Prisma 7 es WASM cargado con `await import(...)` dinámico — Jest sin `--experimental-vm-modules` no lo soporta (`A dynamic import callback was invoked without --experimental-vm-modules`), y activar esa flag en Jest 30 trae su propia cadena de incompatibilidades con `ts-jest` que no se justifican para este proyecto.

Prisma 6 no tiene ninguno de los dos problemas — cliente CommonJS clásico, motor nativo (no WASM), cero configuración especial de Jest. Si en el futuro se reintenta Prisma 7, revisar primero si esa fricción ya se resolvió (es una combinación de librerías muy nueva) antes de repetir el mismo camino.

## Arquitectura

- **Capas**: `src/<dominio>/` con `*.module.ts` + `*.controller.ts` + `*.service.ts` (+ `dto/` cuando el endpoint recibe body) — mapea 1:1 a la capa `repository` de customer-app, pero el "repository" real ahora es Prisma dentro del service.
- **`PrismaModule`** (`@Global()`) expone `PrismaService` (extiende `PrismaClient`, conecta/desconecta en los hooks de ciclo de vida de Nest) a todos los módulos sin reimportarlo.
- **Tipos de dominio**: los DTOs de respuesta usan los tipos de `@mucho-loco/types` (`Branch`, `Product`, `MembershipInfo`, etc.) directamente — son el mismo contrato que ya consume `customer-app`. Los campos `Json` de Prisma (`LocalizedString`, `BranchPromo`, perks) se castean a esos tipos en el mapper de cada service (`toBranch()`, `toProduct()`, etc.), nunca se exponen como `Prisma.JsonValue` crudo.
- **Derivar en vez de guardar**: `MembershipInfo.daysLeft` (antes un campo suelto en el mock, podía desincronizarse de `expiresAt`) y `.plan` (antes un string opaco) se calculan en `MembershipsService` a partir de `expiresAt`/`tierKey`/`periodKey` en cada lectura — nunca se persisten. `plan` reusa el mismo texto no traducido que ya tenía el mock (`ALL GYMS`/`1 GYM` fijo, sin importar idioma) a propósito, para no romper el contrato con customer-app; arreglar esa falta de i18n es un cambio de frontend fuera de alcance aquí (mismo criterio que ya aplicó customer-app a `Visit.day`/`.month`).
- **`Visit.day`/`.month`/`.duration`** se formatean en español en el service (`toVisit()`, mismo defecto latente que el mock, a propósito no corregido — ver punto anterior) a partir de columnas reales (`visitedAt: DateTime`, `durationMinutes: Int`) — el modelo de datos sí es correcto, solo la respuesta imita el string pre-formateado que el contrato actual espera.

## Seguridad — 3 decisiones que NO son fieles al mock a propósito

El mock de `customer-app` confiaba en quien lo llamaba (era código del mismo frontend, sin frontera de red real). Un backend real no puede heredar esa confianza:

1. **La identidad nunca es un parámetro.** El mock recibía `email` como argumento de cada método de `IUserRepository`. Aquí, todo endpoint de `/users/me/*` saca el usuario del ID token verificado (`@CurrentUser()`, ver abajo) — jamás de query/body/params. Ver el test e2e "user A cannot read user B by claiming their email in the body".
2. **El precio de un pedido lo calcula el backend, no el cliente.** `IUserRepository.createOrder()` recibía `items: OrderItem[]` (con nombre/precio ya resueltos) y `total` directo del cliente — un cliente malicioso podía mandar cualquier total. `POST /users/me/orders` (`CreateOrderDto`) solo acepta `{ productId, qty }[]`; el service busca el precio real en `Product` y sume él mismo (+ `HOME_SHIPPING_FEE` si `delivery: 'home'`). El cliente sí manda `lang` (qué idioma congelar en el recibo) porque eso no es sensible.
3. **`ValidationPipe` global con `whitelist` + `forbidNonWhitelisted`.** Cualquier campo que un DTO no declare (ej. un `total` que el cliente intente colar) se rechaza con 400 en vez de ignorarse en silencio — ver el test e2e correspondiente.

## Auth (Cognito — mismo User Pool que los 3 frontends)

- **`CognitoAuthGuard`** (`src/auth/`) es global (`APP_GUARD` en `AppModule`) — toda ruta pide `Authorization: Bearer <idToken>` salvo que use `@Public()` (catálogo: branches, products, membership-tiers, health).
- **Verificación real vía `jose`** (`src/auth/cognito.ts`, `verifyIdToken()`) — mismo criterio que `lib/jwt.ts` en los 3 frontends (firma + expiración + issuer + audience contra el JWKS público de Cognito). `COGNITO_CLIENT_IDS` (coma-separado) acepta el ID token de cualquiera de los 4 app clients (`web`/`mobile`/`owner_panel`/`branch_app`), no solo el de customer-app.
- **`CognitoVerifierService`** envuelve `verifyIdToken()` como provider inyectable — el guard depende de la clase, no de la función suelta. Es la costura que permite testear: los tests e2e hacen `overrideProvider(CognitoVerifierService)` para simular un usuario autenticado sin un User Pool real (no hay uno vivo hoy, ver "Infra destruida" en el CLAUDE.md raíz), sin mockear módulos con `jest.mock()`.
- **Auto-provisión**: la primera vez que se ve un `cognitoSub`, `UsersService.findOrCreateByCognito()` crea el `User` + una membresía default (tier `all`, Roma Sur, activa 30 días) — mismo comportamiento que `fallbackRecord()` en `user.mock.ts` para una cuenta real sin dato curado. Recibe los claims completos (`@CurrentUser()` tal cual), no `sub/email/name` sueltos.
  - **Teléfono (2026-09-12)**: `IdTokenClaims.phone` sale del claim `phone_number` (E.164). Se guarda al crear al socio y se completa en uno que no tenía; nunca se sobrescribe uno existente (el de mostrador gana). Hoy solo mobile-app lo pide al registrarse.
  - **Requests paralelas del mismo socio nuevo (2026-09-12)**: el panel del móvil pide perfil, membresía, visitas y pedidos a la vez, y las cuatro llegan antes de que el socio exista. Socio + membresía se crean en UNA transacción; un choque de índice único (P2002) se trata como "ya lo creó otro" y se relee. Y si el correo ya está ligado a ESTE mismo `sub` (lo creó la request de al lado entre las dos búsquedas), es él, no un 409. Lo prueba el e2e "a brand-new member opening the mobile dashboard" contra Postgres real — ese test fue el que destapó el 409.

## Entorno local

Postgres corre nativo vía Homebrew (`brew services start postgresql@16`), dos bases: `mucho_loco_dev` y `mucho_loco_test`. `DATABASE_URL` en `.env`/`.env.test` apunta a `postgresql://<tu-usuario-de-mac>@localhost:5432/<db>` (sin password — cluster local de Homebrew). Si esta máquina cambia o alguien más clona el repo, instalar Postgres 16 (`brew install postgresql@16`) y crear ambas bases (`createdb mucho_loco_dev`, `createdb mucho_loco_test`) antes de migrar.

```bash
pnpm --filter @mucho-loco/backend prisma generate        # regenerar el cliente tras cambiar schema.prisma
pnpm --filter @mucho-loco/backend exec prisma migrate dev --name <algo>   # nueva migración + aplica a mucho_loco_dev
pnpm --filter @mucho-loco/backend exec prisma db seed     # re-siembra branches/products/membership-tiers (BRANCHES.md ids, ver seed.ts)
pnpm --filter @mucho-loco/backend start:dev               # PORT de .env (3001 hoy, no 3000 — ver .env)
```

`prisma/seed.ts` usa los MISMOS ids/nombres de sucursal y producto que `customer-app/lib/data.ts` (`BRANCHES`, `PRODUCTS`, `MEMBERSHIP_TIERS`) — `branch-app`/`owner-panel` ya referencian esos mismos ids en sus propios mocks (`BRANCH_INVENTORY`, etc.), así que cuando esos apps conecten aquí (Fase 7) los ids ya van a coincidir sin necesitar un mapeo.

## Testing

- **Unit** (`pnpm test`, Jest+ts-jest): `*.service.spec.ts` junto a cada service, `PrismaService` mockeado a mano (sin DB) — lógica pura: cálculo de `daysLeft`/`plan`, `retryPayment`, y sobre todo `createOrder` (precio server-side, rechazo de `cash`+`home`, producto inexistente).
- **E2E** (`pnpm test:e2e`, corre contra `mucho_loco_test` REAL, no mocks): `test/app.e2e-spec.ts` levanta el `AppModule` completo vía `@nestjs/testing` + `supertest`, con `CognitoVerifierService` sobreescrito (`overrideProvider`) para simular sesión sin Cognito real. Cubre: guard (401 sin token / token inválido / rutas públicas sin auth), catálogo semillado (branches/products/tiers), y el flujo completo de un usuario nuevo (auto-provisión → membership → crear pedido con total calculado → retry-payment). Corre con `--runInBand` (una sola base de test compartida entre tests, evita carreras). Cada test de escritura limpia sus propias filas en `afterAll`.
- `jose` (ESM-only) necesita `transformIgnorePatterns` explícito en `test/jest-e2e.json` para que Jest lo transforme en vez de ignorarlo (pnpm anida los paquetes bajo `node_modules/.pnpm/`, el patrón lo tiene en cuenta) — los tests unitarios no lo necesitan porque ninguno importa `cognito.ts`.

## Docker (2026-09-12, validado)

`Dockerfile` en la raíz de este app, pero el **build context es la raíz del monorepo** (workspace de pnpm — necesita ver `pnpm-workspace.yaml` y `packages/types`):

```bash
docker build -f apps/backend/Dockerfile -t mucho-loco-backend .
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://<tu-usuario>@host.docker.internal:5432/mucho_loco_dev?schema=public" \
  -e COGNITO_CLIENT_IDS=<algo-no-vacío> \
  mucho-loco-backend
```

`host.docker.internal` (no `localhost`) porque Postgres corre en el HOST (Homebrew), no en un contenedor — Docker Desktop en Mac resuelve ese nombre al host automáticamente.

Multi-stage (`deps` → `build` → `runtime`), probado de punta a punta: build limpio, contenedor arranca, conecta a Postgres real, `/health` pasa el `HEALTHCHECK` de la imagen, `/branches`/`/products` devuelven los datos sembrados, `/users/me` sin token da 401 — mismo comportamiento que corriendo con `pnpm start:dev`.

**Dos gotchas ya resueltos, documentados en el propio Dockerfile con comentarios**: el entrypoint es `dist/src/main.js`, no `dist/main.js` (`tsconfig.json` no fija `rootDir` a `src`, así que `tsc` conserva esa carpeta dentro de `dist/`); y las etapas que corren `pnpm` necesitan el `package.json` raíz copiado (no solo el de `apps/backend`) para que `corepack` encuentre el campo `packageManager` y no descargue la última versión de pnpm en vez de la fijada.

**Simplificación deliberada, tamaño de imagen ~934MB**: la imagen final carga `node_modules` completo (dev + prod), no uno podado a `--prod`. Se intentó separar una etapa `prod-deps` con `pnpm install --prod` aparte, pero `prisma generate` necesita el CLI de `prisma` (devDependency) — reinstalar con `--prod` en una etapa distinta no lo tiene disponible. La solución real es `pnpm deploy` o `pnpm prune --prod` corridos DESPUÉS de generar el cliente, en la misma etapa `build` — no se intentó a fondo por tiempo; si el tamaño de imagen importa (arranque en Fargate, egress de ECR), es el primer lugar donde optimizar, con cuidado porque `pnpm prune` en un checkout parcial del monorepo (sin los otros 3 apps) puede comportarse raro contra un lockfile que sí los referencia — probar en una rama aparte primero.

**Sin probar todavía**: push a ECR (no hay repositorio creado, eso es Terraform) y correr en ECS Fargate real (necesita la infra aplicada).

## Pendiente (siguiente sesión)

1. Optimizar tamaño de imagen (`pnpm deploy`/`prune --prod`) si hace falta — ver nota arriba.
2. Terraform (`infra/`, ya existe de antes — VPC, RDS, Cognito, y ahora también necesitaría un repositorio ECR) — código intacto, **sin aplicar**: aplicar significa gastar en la cuenta de AWS del usuario y necesita que él cree las apps OAuth de Google/Facebook primero (ver "Nota operativa" en el CLAUDE.md raíz) — pendiente de confirmación explícita antes de correr `terraform apply`.
3. ~~Swap de datasource en `customer-app`~~ — ✅ hecho (2026-09-12), ver "Swap de datasource" en `apps/customer-app/CLAUDE.md`. Tres cosas que salieron de ahí y afectan a ESTE app: (a) el contrato `createOrder` del frontend ahora manda `{productId, qty}` + `lang`, igual que `CreateOrderDto` — ya no hay desajuste; (b) `NewOrderLine` vive en `@mucho-loco/types` y es el tipo que `CreateOrderItemDto` refleja; (c) `AnnouncementsService` ordena por fecha y el mock no — diferencia cosmética documentada, si el orden del tablero importa hace falta una columna de prioridad aquí.
4. CI/CD.
5. Swap de datasource en `branch-app` y `owner-panel` (Fase 7): el backend ya cubre sus 10 dominios, falta que ellos dejen sus mocks. Al hacerlo, ojo con lo mismo que ya mordió a customer-app: **fechas**. Sus mocks todavía traen `expiresAt: '20 JUL 2026'` y este backend manda ISO — hay que formatear al pintar, no antes. Y `owner-panel/src/lib/payroll.ts` se borra: el recibo lo emite el servidor.
