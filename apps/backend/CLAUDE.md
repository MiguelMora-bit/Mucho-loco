# CLAUDE.md — apps/backend

Visión de negocio completa y estructura del monorepo: ver [`CLAUDE.md`](../../CLAUDE.md) en la raíz — sección "Arquitectura de backend" para las decisiones ya tomadas (NestJS sobre AWS nativo, Postgres/RDS, Cognito, ECS Fargate, Terraform) antes de tocar este código.

## Qué es este app

API REST que reemplaza, dominio por dominio, los repositorios mock de `customer-app` — contract-first: cada método de `I*Repository` en `customer-app/lib/repositories/*.ts` es el contrato que un endpoint de aquí tiene que cumplir. Cuando un dominio esté migrado, `customer-app` solo cambia el datasource (mock → HTTP), nunca el resto del app (componentes, stores, tipos).

**Estado (2026-09-11): primer corte, 4 dominios migrados.** `branches`, `products`, `membership-tiers` (catálogo) y `users/me/*` (perfil, membresía + retry-payment, visitas, pedidos) — los 4 que el CLAUDE.md raíz nombra explícitamente para este paso ("branches, products, orders, memberships"). **Todavía en mock, sin migrar**: `community` (feed entre socios), `announcement` (avisos del landing), `social` (feed de marketing/redes), `performance` (workouts/records/heatmap) — quedan para una pasada posterior, no son parte del alcance nombrado. `customer-app` sigue usando sus datasources mock para TODO — el swap real (Fase 5 de la metodología) todavía no se hizo, este backend hoy corre standalone, verificado con tests y curl, no conectado a ningún frontend.

`branch-app`/`owner-panel` no conectan aquí todavía (Fase 7 de la metodología) — sus mocks (inventario, corte de caja, nómina, asistencia, reportes) siguen siendo islas aisladas por app, a propósito, hasta que este backend cubra esos dominios también.

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
- **Verificación real vía `jose`** (`src/auth/cognito.ts`, `verifyIdToken()`) — mismo criterio que `lib/jwt.ts` en los 3 frontends (firma + expiración + issuer + audience contra el JWKS público de Cognito). `COGNITO_CLIENT_IDS` (coma-separado) acepta el ID token de cualquiera de los 3 app clients (`web`/`owner_panel`/`branch_app`), no solo el de customer-app — para cuando branch-app/owner-panel conecten aquí.
- **`CognitoVerifierService`** envuelve `verifyIdToken()` como provider inyectable — el guard depende de la clase, no de la función suelta. Es la costura que permite testear: los tests e2e hacen `overrideProvider(CognitoVerifierService)` para simular un usuario autenticado sin un User Pool real (no hay uno vivo hoy, ver "Infra destruida" en el CLAUDE.md raíz), sin mockear módulos con `jest.mock()`.
- **Auto-provisión**: la primera vez que se ve un `cognitoSub`, `UsersService.findOrCreateByCognito()` crea el `User` + una membresía default (tier `all`, Roma Sur, activa 30 días) — mismo comportamiento que `fallbackRecord()` en `user.mock.ts` para una cuenta real sin dato curado.

## Entorno local

**Sin Docker en esta máquina** — Postgres corre nativo vía Homebrew (`brew services start postgresql@16`), dos bases: `mucho_loco_dev` y `mucho_loco_test`. `DATABASE_URL` en `.env`/`.env.test` apunta a `postgresql://<tu-usuario-de-mac>@localhost:5432/<db>` (sin password — cluster local de Homebrew). Si esta máquina cambia o alguien más clona el repo, instalar Postgres 16 (`brew install postgresql@16`) y crear ambas bases (`createdb mucho_loco_dev`, `createdb mucho_loco_test`) antes de migrar.

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

## Pendiente (siguiente sesión)

1. Dockerfile (multi-stage, `aws-containers`) — sin Docker instalado en esta máquina, no se pudo construir/correr localmente para validar; el código Node del backend en sí ya corre y está probado, falta el empaquetado.
2. Terraform (`infra/`, ya existe de antes — VPC, RDS, Cognito) — código intacto, **sin aplicar**: aplicar significa gastar en la cuenta de AWS del usuario y necesita que él cree las apps OAuth de Google/Facebook primero (ver "Nota operativa" en el CLAUDE.md raíz) — pendiente de confirmación explícita antes de correr `terraform apply`.
3. Swap de datasource en `customer-app` (mock → HTTP) para los 4 dominios ya migrados — no se tocó todavía, cero riesgo de romper el mock-first que ya funciona.
4. CI/CD, y después los dominios que faltan (community/announcements/social/performance) + branch-app/owner-panel.
