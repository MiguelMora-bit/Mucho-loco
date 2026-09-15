# CLAUDE.md — Mucho Loco Gym (monorepo)

## Contexto del proyecto

Tienda y app de membresías para "Mucho Loco Gym" (cadena de 15 sucursales, CDMX). Proyecto de aprendizaje fullstack de Miguel — único desarrollador, sin equipo. El usuario está aprendiendo Next.js (viene de React) y AWS. Explicar conceptos nuevos ligándolos a lo que ya sabe de React.

## Estructura del monorepo

Gestionado con **pnpm workspaces + Turborepo**. Un único desarrollador, así que el monorepo prioriza compartir tipos/lógica de dominio sobre aislar equipos.

```
mucho-loco/
  apps/
    customer-app/       # Next.js — tienda + app del socio (web) — Fase 1 completa
    mobile-app/         # Expo (React Native) — app del socio nativa, iOS/Android — primer corte mock-first (2026-09-12)
    branch-app/         # Vite + React SPA — Fase 1 y 2 completas
    owner-panel/        # Vite + React SPA — Fase 1, 2 y 3 completas
    backend/            # NestJS + Prisma + Postgres — 4 dominios migrados (branches/products/membership-tiers/users), ver su CLAUDE.md
  packages/
    types/              # @mucho-loco/types — tipos de dominio compartidos (Branch, Product, etc.)
    api-client/         # @mucho-loco/api-client — cliente HTTP del backend (los 4 frontends)
    customer-core/      # @mucho-loco/customer-core — contrato, mocks, catálogo semilla, formato y textos del socio (customer-app, mobile-app)
```

Comandos desde la raíz:
```bash
pnpm install         # instala todo el workspace
pnpm dev             # turbo run dev — corre dev de todos los apps (o pnpm --filter <app> dev)
pnpm build           # turbo run build — respeta orden de dependencias entre paquetes
```

Cada app nuevo tiene su propio `CLAUDE.md` con sus convenciones específicas: `apps/customer-app/CLAUDE.md`, `apps/mobile-app/CLAUDE.md`, `apps/branch-app/CLAUDE.md`, `apps/owner-panel/CLAUDE.md` y `apps/backend/CLAUDE.md`.

**branch-app y owner-panel son Vite + React (SPA), no Next.js** — decisión explícita (2026-09-02): son herramientas internas para staff/dueño sin necesidad de SEO/SSR, y usar un framework distinto por app (se evaluó Vue/Angular para aprender) hubiera fragmentado el stack de un desarrollador solo sin ganancia real. Comparten `@mucho-loco/types` con customer-app y, desde 2026-09-12, `@mucho-loco/api-client` (el cliente HTTP del backend) — que ese mismo día adoptaron también customer-app y mobile-app, a través de los datasources de `@mucho-loco/customer-core/http`. `lib/stores/createAsyncResource.ts` (el factory de Zustand para el patrón mock-first) sigue duplicado en los 3 apps a propósito: son ~20 líneas sin lógica que se pueda desincronizar. El cliente HTTP sí se extrajo porque cumplió el criterio contrario — 130 líneas de lógica real (timeouts, traducción de errores, 404→null) a punto de tener una tercera copia, donde un arreglo en una no llegaba a las otras.

**mobile-app es React Native + Expo, no Flutter** — decisión explícita (2026-09-12), mismo argumento que la de arriba: todo lo que no es UI ya era TypeScript puro (tipos, contrato `I*Repository`, mocks, precios, fechas, textos) y se reusa tal cual; con Flutter (Dart) había que reescribir `@mucho-loco/types` a mano y tener una cuarta copia del cliente HTTP en otro lenguaje. Para compartirlo se extrajo `@mucho-loco/customer-core` de customer-app (que dejó re-exports de una línea en `lib/data|pricing|dates|orderStatus.ts` para no tocar a sus importadores). Lo que NO se comparte es la UI: DOM + Tailwind en la web, componentes nativos en el móvil — las pantallas se escriben dos veces, con cualquier framework. Detalle en `apps/mobile-app/CLAUDE.md`.

## Visión completa del proyecto (negocio)

Esto NO es solo una tienda: es el sistema completo de "Mucho Loco Gym", cadena de ~15 sucursales (se abren/cierran) que también vende productos propios (preentrenos, proteína, gomitas). Son 3 sistemas:

1. **Tienda + app del cliente** — hoy vive en `apps/customer-app` (web) y `apps/mobile-app` (iOS/Android).
2. **App de sucursal** (staff) — pedidos a entregar, venta de mostrador, caja.
3. **Panel del dueño** (HQ) — estadísticas, inventario global, nómina.

### Reglas de negocio confirmadas

- **Membresía y alcance de acceso (corregido 2026-09-10 — el código ya lo tenía así, el texto viejo de esta regla estaba desactualizado)**: dos tiers ortogonales a la duración (visita/semanal/mensual/trimestral/anual), cada uno con su propio precio — `single` ("1 sucursal", factor 1.0): acceso solo a la sucursal de inscripción; `all` ("15 sucursales", factor 1.5, tier popular): acceso a cualquiera de las 15. Ver `TierKey`/`MembershipTier` en `@mucho-loco/types` y `lib/pricing.ts` en `customer-app`.
- **QR de acceso**: código fijo, válido mientras la membresía esté vigente (no rota). Con tier `single`, el validador de sucursal (`branch-app`, `/qr`, implementado 2026-09-10) RECHAZA el check-in fuera de la sucursal de inscripción con un mensaje claro ("sucursal incorrecta"); con tier `all`, se acepta en cualquiera de las 15. El QR es el mismo código real de punta a punta: lo que `customer-app` genera en el dashboard del socio es exactamente lo que `branch-app` escanea (cámara real o lector físico) y valida — ver CLAUDE.md de `branch-app`, sección "QR real".
- **Métodos de acceso — huella dactilar y búsqueda por nombre (huella 2026-09-12, nombre 2026-09-12)**: no todos los socios tendrán la app instalada, así que además del QR se puede dar de alta a un socio directo en mostrador con su huella dactilar (hardware ya instalado en sucursal) en vez de QR — mismas reglas de tier/sucursal/vigencia que el QR, solo cambia el credential con el que se busca al socio. Alcance decidido: solo altas nuevas sin app (no se agrega huella a un socio que ya tiene cuenta/QR de la app). Mockeado por ahora (mismo criterio contract-first que el resto del proyecto) — todavía no se conoce el SDK/driver real del lector. Como último recurso si no hay app y el lector de huella falla, `/qr` de `branch-app` también permite buscar al socio por nombre — los 3 métodos (QR/huella/nombre) implementan una misma interfaz (`AccessMethod`, patrón Strategy) y comparten la misma regla de negocio de acceso; ver CLAUDE.md de `branch-app`, sección "Métodos de acceso: QR, huella y nombre".
- **Pago recurrente de mensualidad**: si falla el cobro, hay periodo de gracia con avisos antes de suspender el acceso. Implementado 2026-09-13 con Stripe Billing: visita = pago único; semanal/mensual/trimestral/anual = suscripción que se cobra sola; gracia de 7 días; un socio nuevo **nace sin membresía** hasta que paga (antes se le regalaba una). Ver "Membresías con Stripe Billing" en `apps/backend/CLAUDE.md`.
- **Inventario por sucursal**: cada sucursal sabe su stock físico real. Venta de mostrador descuenta del stock LOCAL de esa sucursal. Envíos a domicilio siempre salen de una bodega central única. "Recoger en gym" = la sucursal que el cliente elige al comprar.
- **Pagos en línea (revisado 2026-09-14)**: todo pago en línea pasa por **Stripe**, que en su página ofrece tarjeta, OXXO y transferencia SPEI (hay que tenerlos activados en el dashboard de Stripe). También se puede elegir "efectivo", pero solo cuando la entrega es "recoger en gym" (decidido 2026-09-08) — el pedido queda pendiente de pago y se cobra al recoger; no aplica a domicilio. Fuera de esto, efectivo sigue siendo exclusivo de venta de mostrador. **Transferencia manual, Mercado Pago y PayPal se quitaron del checkout**: creaban el pedido como pagado sin cobrar nada (se podía recoger en mostrador sin pagar). Vuelven cuando exista su cobro de verdad. Un pedido solo queda "pagado" por el webhook de Stripe o porque mostrador cobró el efectivo.
- **Envíos a domicilio (2026-09-14)**: salen de la bodega central, que hoy opera HQ desde `owner-panel` (`/shipments`): por enviar → en camino (con guía opcional) → entregado. Solo aparecen pedidos cobrados. El socio ve el estado y la guía en su panel.
- **Facturación CFDI 4.0 (decidido 2026-09-14)**: sí, desde el sistema, vía un PAC con API (candidato: Facturapi, que tiene recibos para autofacturar y factura global de lo que nadie facturó). Stripe NO emite CFDI — lo que el código llama "factura" en membresías es un invoice de Stripe Billing, un cobro. Reparto: `backend` es el núcleo; `customer-app` y `mobile-app` capturan datos fiscales y dejan "Facturar" (la web además tiene una página pública `/facturar` para tickets de mostrador); `branch-app` solo imprime la clave de autofacturación en el ticket (no captura RFC); `owner-panel` lista CFDI, factura global, cancelaciones y exporta para el contador. **Un solo RFC para las 15 sucursales (decidido 2026-09-15)**: un solo emisor y un solo certificado (CSD) en el PAC; la sucursal no cambia quién factura. **Paso 1 ✅ (2026-09-14)**: registro único de cobros (`Charge`) — ver "Registro de cobros" en `apps/backend/CLAUDE.md`. Paso 2 (emitir) pendiente.
- **Control de dinero en sucursal**: corte de caja por turno/día, auditable desde el panel del dueño.
- **Roles en sucursal**: diferenciados — gerente (caja, reportes, inventario local) vs. mostrador (pedidos, cobro, QR).
- **Nómina**: cálculo completo (asistencia, deducciones, recibos), no solo registro de gasto.
- **Login social (decidido 2026-09-11): Google y Facebook**, para los dos clientes del socio: `customer-app` y, desde 2026-09-12, `mobile-app` con su propio app client `mobile` (staff/gerente/dueño siguen email/password). Implementado vía Hosted UI de Cognito (IdPs `aws_cognito_identity_provider` en `infra/modules/cognito`) — ver detalle del flujo OAuth/PKCE en `apps/customer-app/CLAUDE.md`, sección "Auth flow". Credenciales de Google/Facebook van en `infra/envs/dev/terraform.tfvars` (gitignored, plantilla en `terraform.tfvars.example`), nunca en el código ni en el chat.
- **Sin clases con reservación** (por ahora): acceso libre a pesas/máquinas. Coaches son parte del staff/ambiente, sin agenda con cupo.
- **Comunidad**: feed social básico entre socios (posts, likes, comentarios). Sin rankings ni conexión automática con el módulo Rendimiento por ahora.

### Fases del proyecto

- **Fase 1 (MVP) — ✅ completa (2026-09-11)** — tienda en línea completa, registro/login (correo + redes), mapa de sucursales con precios/promos, membresía con pago recurrente + periodo de gracia, panel del socio (pedidos, QR, avisos de vencimiento), feed social básico ("Comunidad" — distinto del feed de marketing del landing), versión mínima de sucursal (marcar pedidos de "recoger" como entregados, vender en mostrador descontando stock local, validar QR), y panel del dueño básico (estadísticas de ventas, clientes activos por sucursal, inventario global consolidado — solo lectura).
- **Fase 2 — ✅ completa (2026-09-11)** — app de sucursal completa (corte de caja, roles gerente/mostrador, reportes/inventario local de gerente) + panel del dueño completo (transferencias de inventario, gastos).
- **Fase 3 — ✅ completa para producto (2026-09-11)** — nómina (`owner-panel`, empleados/periodos/deducciones/recibos) + captura real de asistencia (`branch-app`, `/attendance`) + reportes ejecutivos avanzados (`owner-panel`, `/reports`). **El hueco que quedaba (asistencia de `branch-app` → nómina de `owner-panel`) ya está resuelto del lado del backend (2026-09-12)**: ambos dominios viven en la misma base y `daysWorked` se cuenta de los turnos fichados de verdad, no de un dato semilla. Falta solo que los dos apps dejen sus mocks y apunten ahí (punto 7 de la metodología).

### Arquitectura de backend (decidida 2026-08-30)

**NestJS sobre AWS nativo** (no Amplify). Objetivo explícito del usuario: aprender AWS de forma realista, como en una empresa seria — no el camino más corto (Amplify/serverless-first), sino el stack que se encuentra en un backend de producción típico.

- **NestJS** como monolito modular (no microservicios todavía — con un solo dev, microservicios agregan complejidad operativa sin beneficio real; los módulos de Nest ya dan el límite de dominio que permitiría separar después si hiciera falta).
- **PostgreSQL en RDS + Prisma** como ORM — no DynamoDB. Relacional encaja mejor con el dominio (sucursales, membresías, inventario, nómina tienen relaciones fuertes) y es lo que se ve en la mayoría de backends NestJS reales.
- **Cognito User Pools** para auth (emite JWT, NestJS lo valida vía Passport) — se mantiene aunque no se use Amplify; Cognito es independiente de Amplify.
- **Docker → ECR → ECS Fargate detrás de un ALB** para desplegar NestJS — el patrón estándar para un servidor persistente en AWS (no Lambda, que es para funciones cortas/stateless).
- **Terraform** como infraestructura como código (decisión revisada 2026-09-09, reemplaza CDK) — prioridad: levantar y destruir recursos rápido durante aprendizaje/pruebas (`terraform apply` / `terraform destroy`), sobre la ventaja de "mismo lenguaje que el monorepo" que ofrecía CDK. Vive en `infra/` (Terraform, no en `apps/`) con backend remoto de state (S3 + DynamoDB para lock) una vez que haya recursos reales que proteger.
- **@nestjs/swagger** para documentar la API (OpenAPI) — librería oficial de Nest, no requiere skill aparte.
- Frontend (`customer-app`) se despliega en **Vercel**, no en AWS — es lo que hace la mayoría de empresas reales con stack Next.js + backend propio en AWS, y mantiene el foco de aprendizaje de AWS en el backend/infra en vez de en hosting de frontend.
- **WhatsApp Business Platform (Cloud API de Meta)** para notificaciones — avisos de vencimiento de membresía/periodo de gracia, pedido listo para retiro, confirmación de pago. Se elige sobre email porque WhatsApp es el canal dominante en México. ✅ Implementado (2026-09-12): módulo `notifications` en `apps/backend` con plantillas, idempotencia en base, cron diario de vencimientos y webhook con verificación de firma — ver "Notificaciones por WhatsApp" en su CLAUDE.md. **Sin probar contra Meta**: falta la app verificada de Meta Business y las plantillas aprobadas. Distinto de WhatsApp Business (la app gratis) que solo son links `wa.me` — eso ya está en el frontend, sin backend.

`aws-amplify` y `aws-blocks` quedan instaladas pero dejan de ser la ruta activa — no se usan en este proyecto salvo que se decida lo contrario.

### Metodología

**Contract-first**: terminar `customer-app` completamente mock-funcional (todos los flujos de usuario funcionando con datos falsos, sin huecos) ANTES de escribir el backend. La capa `lib/repositories/` de `customer-app` ya está diseñada para esto — cada método de repositorio define el contrato que el backend real va a tener que cumplir. Cuando el backend esté listo, solo se cambia el datasource (de mock a HTTP), no el resto de la app.

Orden de fases:
1. ✅ `customer-app` 100% mock-funcional (flujos completos: tienda, cuenta, checkout, panel, rendimiento).
2. ✅ Contrato de API derivado de los repositorios existentes — hecho para los 8 dominios ya migrados (`branches`/`products`/`membership-tiers`/`users`/`announcements`/`social`/`performance`/`community`, ver punto 4).
3. ⏳ Fundaciones AWS vía Terraform: código en `infra/` ya existe de una vuelta anterior, pero está **destruido** (ver "Nota operativa" abajo) — sin aplicar todavía.
4. ✅ Backend NestJS: `apps/backend` — 8 dominios migrados (`branches`/`products`/`memberships`/`users` + `announcements`/`social`/`performance`/`community`, esta segunda tanda 2026-09-12) + Prisma (Postgres local vía Homebrew, sin Docker en esta máquina) + auth con Cognito (`CognitoAuthGuard`, sin probar contra un User Pool real todavía porque la infra está destruida — sí probado end-to-end con `CognitoVerifierService` sobreescrito en tests). Ver `apps/backend/CLAUDE.md` para el detalle completo, incluida la decisión de usar Prisma 6 en vez de 7 y el tratamiento especial de `performance` (seed fijo, sin captura real de entrenamientos todavía) y `community` (el único de los 4 nuevos con lógica real, feed sin datos semilla).
5. ⏳ (parcial) Conectar: ✅ swap de datasource mock → HTTP en `customer-app` implementado y verificado (2026-09-12); desde el mismo día esos datasources viven en `@mucho-loco/customer-core/http` y `mobile-app` usa exactamente los mismos, detrás de `EXPO_PUBLIC_DATA_SOURCE=http` — los 8 dominios tienen datasource HTTP detrás de `NEXT_PUBLIC_DATA_SOURCE=http`, con el mock como default; ver "Swap de datasource" en `apps/customer-app/CLAUDE.md`. Los dominios públicos se probaron contra el backend real (tests de integración que comparan mock vs HTTP campo por campo + páginas SSR renderizando dato vivo de Postgres); los de cuenta solo hasta el 401 del guard, porque no hay User Pool vivo. ✅ Docker validado (2026-09-12) — `apps/backend/Dockerfile`, build + contenedor corriendo localmente contra Postgres real, ver su CLAUDE.md. ✅ Infra de Terraform completa (2026-09-12): `infra/` ya tiene VPC, RDS, ECR y ECS Fargate + ALB además de Cognito — `terraform plan` limpio (50 recursos), **sin aplicar** (cuesta dinero, ver "Nota operativa"). ✅ CI/CD (2026-09-12): `test.yml` corre typecheck/lint, unit, e2e del backend contra Postgres real y los tests de contrato; `deploy.yml` construye, sube a ECR y redespliega ECS vía OIDC (sin llaves de larga vida), manual mientras la infra no viva permanentemente. Falta: el primer `terraform apply` y el primer push de imagen.
6. ⏳ (parcial) Pagos: ✅ Stripe implementado y **probado contra Stripe real** (2026-09-12): sandbox real, token real de Cognito, pago real con tarjeta de prueba en la página hospedada, webhook real verificado y pedido surtido — ver "Pagos con Stripe" en `apps/backend/CLAUDE.md`. ✅ Membresía recurrente con Stripe Billing (2026-09-13): contratar desde el landing/panel (web) o la pantalla `membership` (móvil), renovación automática, gracia y vencimiento — probada contra el sandbox de Stripe (alta, visita, renovación rechazada → gracia → pago del atraso → activa, cancelación) — solo falta la renovación natural al fin de periodo, que necesita test clocks y el sandbox reclamado; ver "Membresías con Stripe Billing" en `apps/backend/CLAUDE.md`. ⏳ Falta PayPal, Mercado Pago y el portal de cliente (cancelar/cambiar plan).
7. ✅ `branch-app` y `owner-panel` reusando `apps/backend` (2026-09-12): el backend cubre sus 10 dominios y **los 10 repositorios de los dos apps están migrados** (6 de `branch-app`, 4 de `owner-panel`), detrás de `VITE_DATA_SOURCE=http` con mock de default. Ver "Swap de datasource" en el CLAUDE.md de cada uno. Los tres frontends hablan el mismo contrato; falta desplegarlo.

### Pendiente de decidir

- Qué pasa con socios/empleados si cierra una sucursal.
- Política de devoluciones/cancelaciones (también decide cómo se cancela o corrige un CFDI).
- Con el contador: clave SAT real (ClaveProdServ) de cada categoría fiscal, IEPS de las bebidas energizantes, y el plazo para que un cliente pida factura.

### Convención: fechas en ISO (2026-09-12)

Toda fecha que cruza el contrato va en **ISO** y la formatea quien la pinta, con `timeZone: 'UTC'` fijado (una fecha sin hora se parsea como medianoche UTC, y en México imprimiría el día anterior). Cada app tiene su `lib/dates.ts`.

No es cosmético: mandar `'20 JUL 2026'` obliga al backend a saber los nombres de los meses en español y deja una pantalla que **no puede cambiar de idioma**. Además, mock y backend formateando distinto rompía la UI al prender `DATA_SOURCE=http` — pasó de verdad en el pase del socio de `customer-app`.

Ya convertidos: `Order.date`, `MembershipInfo.expiresAt`/`.graceEndsAt`, `MemberAccessRecord.expiresAt`, `Visit` (`visitedAt` + `durationMinutes`), `Expense.date`, `Employee.hireDate`, `PayrollPeriod`, `Payslip.generatedAt`. La excepción deliberada es `UserProfile.birthdate`: lo escribe el socio, no lo genera el sistema.

### Skills instaladas para este proyecto (`.agents/skills/`, ver `skills-lock.json`)

Viven en la raíz del monorepo — aplican a todos los apps, no solo a `customer-app`.

- `stripe-best-practices`, `stripe-projects` (oficial Stripe) — pagos con tarjeta/Stripe.
- `paypal-integration` — pagos PayPal.
- `aws-auth` (oficial AWS) — Cognito.
- `aws-cdk` (oficial AWS) — instalada pero no activa (IaC cambió a Terraform, ver "Arquitectura de backend"); no hay skill oficial de Terraform instalada, se trabaja directo con el usuario.
- `aws-containers` (oficial AWS) — Docker/ECS/Fargate.
- `prisma-database-setup` (oficial Prisma) — ORM + PostgreSQL. La skill documenta el flujo de Prisma 7 (driver adapters, `prisma.config.ts`); `apps/backend` usa Prisma 6 clásico a propósito — ver "Decisión importante: Prisma 6, no Prisma 7" en `apps/backend/CLAUDE.md` antes de seguir la skill al pie de la letra aquí.
- `database-schema-designer` — diseño de esquema multi-sucursal.
- `nestjs-best-practices`, `nestjs-patterns`, `frontend-design`, `vercel-composition-patterns`, `vercel-react-native-skills`, `vercel-react-view-transitions`.
- `tailwind-css` — se adapta a la versión de Tailwind instalada (hoy v3 en `customer-app`); no asume v4 aunque su metadata lo mencione.
- `aws-amplify`, `aws-blocks` — instaladas pero no activas (ruta serverless-first no elegida).

No hay skill confiable instalable para Mercado Pago, inventario/POS multi-sucursal ni mapa de sucursales — se diseñan directo con el usuario.

### Nota operativa

Solo `README.md` estaba trackeado en git antes de la migración a monorepo (todo el resto de `apps/customer-app` nunca se hizo `git add`). Revisar `git status` antes del próximo commit para confirmar qué se está agregando.

**Infra destruida (2026-09-12).** `terraform destroy` corrido en `infra/envs/dev` — cero recursos vivos en la cuenta AWS (verificado: `terraform state list` vacío, `list-user-pools` vacío, `describe-repositories` vacío, cero VPCs no-default). El código en `infra/` está completo y con `plan` limpio (51 recursos desde que existe el app client `mobile`), solo hace falta aplicarlo.

Más tarde ese mismo día se volvió a aplicar solo Cognito (`terraform apply -target=module.cognito`) para probar el login real de mobile-app contra un pool vivo — funcionó, quedó documentado en `apps/mobile-app/CLAUDE.md` — y se destruyó otra vez con `terraform destroy`: **de nuevo cero recursos vivos**. Los `.env`/`.env.local` del backend, customer-app, owner-panel y branch-app quedaron apuntando a ese pool (`us-east-1_b3eTLBZtB`), que ya no existe; el paso 3 de abajo los corrige. mobile-app no tiene `.env.local` (arranca en mock).

Ese mismo día se había aplicado el subconjunto gratuito (Cognito + ECR + red) para probar el flujo real de login y de pago con Stripe — sirvió, quedó documentado en `apps/backend/CLAUDE.md`, y se tiró después. Los `.env.local` de los 3 apps quedaron con IDs de un pool que ya no existe; el paso 3 de abajo los corrige.

Para retomar:

1. **Antes del apply** — crear las apps OAuth reales y llenar `infra/envs/dev/terraform.tfvars` (copiar de `terraform.tfvars.example`, ese archivo no está en git): OAuth client de Google (console.cloud.google.com) y app de Meta for Developers (developers.facebook.com) con producto "Facebook Login". El redirect URI exacto a registrar en ambos está documentado en `terraform.tfvars.example`. Sin esto, `terraform apply` igual funciona pero sin los IdPs de Google/Facebook (quedan vacíos por default, ver `infra/modules/cognito/variables.tf`).
2. `cd infra/envs/dev && terraform apply` — recrea el User Pool y los 4 App Clients (`web`, `mobile`, `owner_panel`, `branch_app`) con IDs NUEVOS (no van a coincidir con los que están en el historial de este chat).
3. Actualizar `.env.local` en `apps/customer-app`, `apps/owner-panel` y `apps/branch-app` con los IDs nuevos (`terraform output`) — los `.env.local` viejos van a tener valores obsoletos. `apps/mobile-app` también: `EXPO_PUBLIC_AUTH=cognito`, `EXPO_PUBLIC_COGNITO_CLIENT_ID` (= `mobile_client_id`) y `EXPO_PUBLIC_COGNITO_DOMAIN` (ver su `.env.example`). Y `COGNITO_CLIENT_IDS` en `apps/backend/.env` tiene que incluir el `mobile_client_id`, o el backend le responde 401 a todo lo del móvil. `customer-app` además necesita `COGNITO_DOMAIN` (`terraform output cognito_domain`, nuevo desde el login social).
4. Recrear los 6 usuarios de prueba reales (`AdminCreateUser` + `AdminSetUserPassword --permanent`, y `AdminAddUserToGroup` para los que tienen rol) — la destrucción del User Pool los borró a todos:
   - `diego@mucholoco.mx` / `valeria@mucholoco.mx` — clientes (customer-app, sin grupo), passwords `Bestia123!`.
   - `rodrigo@mucholoco.mx` — grupo `owner`.
   - `ana@mucholoco.mx` — grupo `manager`. `luis@mucholoco.mx` — grupo `staff`. Ambos ya están en `branch-app/src/lib/staffDirectory.ts` (Roma Sur) — no hace falta tocar ese archivo.
   - `e2e.playwright@mucholoco.mx` — lo recrea solo `tests/e2e/global-setup.ts` de `customer-app` al correr `pnpm test:e2e`, no hace falta hacerlo a mano.
