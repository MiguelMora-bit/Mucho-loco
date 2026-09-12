# CLAUDE.md — Mucho Loco Gym (monorepo)

## Contexto del proyecto

Tienda y app de membresías para "Mucho Loco Gym" (cadena de 15 sucursales, CDMX). Proyecto de aprendizaje fullstack de Miguel — único desarrollador, sin equipo. El usuario está aprendiendo Next.js (viene de React) y AWS. Explicar conceptos nuevos ligándolos a lo que ya sabe de React.

## Estructura del monorepo

Gestionado con **pnpm workspaces + Turborepo**. Un único desarrollador, así que el monorepo prioriza compartir tipos/lógica de dominio sobre aislar equipos.

```
mucho-loco/
  apps/
    customer-app/       # Next.js — tienda + app del socio — Fase 1 completa
    branch-app/         # Vite + React SPA — Fase 1 y 2 completas
    owner-panel/        # Vite + React SPA — Fase 1, 2 y 3 completas
    backend/            # NestJS + Prisma + Postgres — 4 dominios migrados (branches/products/membership-tiers/users), ver su CLAUDE.md
  packages/
    types/              # @mucho-loco/types — tipos de dominio compartidos (Branch, Product, etc.)
```

Comandos desde la raíz:
```bash
pnpm install         # instala todo el workspace
pnpm dev             # turbo run dev — corre dev de todos los apps (o pnpm --filter <app> dev)
pnpm build           # turbo run build — respeta orden de dependencias entre paquetes
```

Cada app nuevo tiene su propio `CLAUDE.md` con sus convenciones específicas: `apps/customer-app/CLAUDE.md`, `apps/branch-app/CLAUDE.md`, `apps/owner-panel/CLAUDE.md` y `apps/backend/CLAUDE.md`.

**branch-app y owner-panel son Vite + React (SPA), no Next.js** — decisión explícita (2026-09-02): son herramientas internas para staff/dueño sin necesidad de SEO/SSR, y usar un framework distinto por app (se evaluó Vue/Angular para aprender) hubiera fragmentado el stack de un desarrollador solo sin ganancia real. Comparten `@mucho-loco/types` con customer-app, pero **no** comparten código de runtime (stores, hooks) todavía — `lib/stores/createAsyncResource.ts` (el factory de Zustand para el patrón mock-first) vive duplicado en los 3 apps a propósito: son ~20 líneas, y extraerlo a un paquete compartido ahora costaría más en wiring de workspace que lo que ahorra. Extraer solo si crece lógica real (retries, caché) o aparece un 4to consumidor.

## Visión completa del proyecto (negocio)

Esto NO es solo una tienda: es el sistema completo de "Mucho Loco Gym", cadena de ~15 sucursales (se abren/cierran) que también vende productos propios (preentrenos, proteína, gomitas). Son 3 sistemas:

1. **Tienda + app del cliente** — hoy vive en `apps/customer-app`.
2. **App de sucursal** (staff) — pedidos a entregar, venta de mostrador, caja.
3. **Panel del dueño** (HQ) — estadísticas, inventario global, nómina.

### Reglas de negocio confirmadas

- **Membresía y alcance de acceso (corregido 2026-09-10 — el código ya lo tenía así, el texto viejo de esta regla estaba desactualizado)**: dos tiers ortogonales a la duración (visita/semanal/mensual/trimestral/anual), cada uno con su propio precio — `single` ("1 sucursal", factor 1.0): acceso solo a la sucursal de inscripción; `all` ("15 sucursales", factor 1.5, tier popular): acceso a cualquiera de las 15. Ver `TierKey`/`MembershipTier` en `@mucho-loco/types` y `lib/pricing.ts` en `customer-app`.
- **QR de acceso**: código fijo, válido mientras la membresía esté vigente (no rota). Con tier `single`, el validador de sucursal (`branch-app`, `/qr`, implementado 2026-09-10) RECHAZA el check-in fuera de la sucursal de inscripción con un mensaje claro ("sucursal incorrecta"); con tier `all`, se acepta en cualquiera de las 15. El QR es el mismo código real de punta a punta: lo que `customer-app` genera en el dashboard del socio es exactamente lo que `branch-app` escanea (cámara real o lector físico) y valida — ver CLAUDE.md de `branch-app`, sección "QR real".
- **Pago recurrente de mensualidad**: si falla el cobro, hay periodo de gracia con avisos antes de suspender el acceso.
- **Inventario por sucursal**: cada sucursal sabe su stock físico real. Venta de mostrador descuenta del stock LOCAL de esa sucursal. Envíos a domicilio siempre salen de una bodega central única. "Recoger en gym" = la sucursal que el cliente elige al comprar.
- **Pagos en línea**: tarjeta, transferencia, Mercado Pago, PayPal, Stripe. También se puede elegir "efectivo" en el checkout online, pero solo cuando la entrega es "recoger en gym" (decidido 2026-09-08) — el pedido queda pendiente de pago y se cobra en efectivo al recoger; no aplica si la entrega es a domicilio. Fuera de esto, efectivo sigue siendo exclusivo de venta de mostrador en sucursal.
- **Control de dinero en sucursal**: corte de caja por turno/día, auditable desde el panel del dueño.
- **Roles en sucursal**: diferenciados — gerente (caja, reportes, inventario local) vs. mostrador (pedidos, cobro, QR).
- **Nómina**: cálculo completo (asistencia, deducciones, recibos), no solo registro de gasto.
- **Login social (decidido 2026-09-11): Google y Facebook**, solo para `customer-app` (staff/gerente/dueño siguen email/password). Implementado vía Hosted UI de Cognito (IdPs `aws_cognito_identity_provider` en `infra/modules/cognito`) — ver detalle del flujo OAuth/PKCE en `apps/customer-app/CLAUDE.md`, sección "Auth flow". Credenciales de Google/Facebook van en `infra/envs/dev/terraform.tfvars` (gitignored, plantilla en `terraform.tfvars.example`), nunca en el código ni en el chat.
- **Sin clases con reservación** (por ahora): acceso libre a pesas/máquinas. Coaches son parte del staff/ambiente, sin agenda con cupo.
- **Comunidad**: feed social básico entre socios (posts, likes, comentarios). Sin rankings ni conexión automática con el módulo Rendimiento por ahora.

### Fases del proyecto

- **Fase 1 (MVP) — ✅ completa (2026-09-11)** — tienda en línea completa, registro/login (correo + redes), mapa de sucursales con precios/promos, membresía con pago recurrente + periodo de gracia, panel del socio (pedidos, QR, avisos de vencimiento), feed social básico ("Comunidad" — distinto del feed de marketing del landing), versión mínima de sucursal (marcar pedidos de "recoger" como entregados, vender en mostrador descontando stock local, validar QR), y panel del dueño básico (estadísticas de ventas, clientes activos por sucursal, inventario global consolidado — solo lectura).
- **Fase 2 — ✅ completa (2026-09-11)** — app de sucursal completa (corte de caja, roles gerente/mostrador, reportes/inventario local de gerente) + panel del dueño completo (transferencias de inventario, gastos).
- **Fase 3 — ✅ completa para producto (2026-09-11)** — nómina (`owner-panel`, empleados/periodos/deducciones/recibos) + captura real de asistencia (`branch-app`, `/attendance`) + reportes ejecutivos avanzados (`owner-panel`, `/reports`). Pendiente, y depende del backend real: `branch-app` y `owner-panel` todavía corren mocks aislados por app (ver "no comparten código de runtime" arriba) — la asistencia real que captura `branch-app` no llega todavía al cálculo de nómina de `owner-panel`, eso requiere que ambos compartan la misma base de datos.

### Arquitectura de backend (decidida 2026-08-30)

**NestJS sobre AWS nativo** (no Amplify). Objetivo explícito del usuario: aprender AWS de forma realista, como en una empresa seria — no el camino más corto (Amplify/serverless-first), sino el stack que se encuentra en un backend de producción típico.

- **NestJS** como monolito modular (no microservicios todavía — con un solo dev, microservicios agregan complejidad operativa sin beneficio real; los módulos de Nest ya dan el límite de dominio que permitiría separar después si hiciera falta).
- **PostgreSQL en RDS + Prisma** como ORM — no DynamoDB. Relacional encaja mejor con el dominio (sucursales, membresías, inventario, nómina tienen relaciones fuertes) y es lo que se ve en la mayoría de backends NestJS reales.
- **Cognito User Pools** para auth (emite JWT, NestJS lo valida vía Passport) — se mantiene aunque no se use Amplify; Cognito es independiente de Amplify.
- **Docker → ECR → ECS Fargate detrás de un ALB** para desplegar NestJS — el patrón estándar para un servidor persistente en AWS (no Lambda, que es para funciones cortas/stateless).
- **Terraform** como infraestructura como código (decisión revisada 2026-09-09, reemplaza CDK) — prioridad: levantar y destruir recursos rápido durante aprendizaje/pruebas (`terraform apply` / `terraform destroy`), sobre la ventaja de "mismo lenguaje que el monorepo" que ofrecía CDK. Vive en `infra/` (Terraform, no en `apps/`) con backend remoto de state (S3 + DynamoDB para lock) una vez que haya recursos reales que proteger.
- **@nestjs/swagger** para documentar la API (OpenAPI) — librería oficial de Nest, no requiere skill aparte.
- Frontend (`customer-app`) se despliega en **Vercel**, no en AWS — es lo que hace la mayoría de empresas reales con stack Next.js + backend propio en AWS, y mantiene el foco de aprendizaje de AWS en el backend/infra en vez de en hosting de frontend.
- **WhatsApp Business Platform (Cloud API de Meta)** para notificaciones — avisos de vencimiento de membresía/periodo de gracia, pedido listo para retiro, confirmación de pago. Se elige sobre email porque WhatsApp es el canal dominante en México. Requiere un módulo de backend (webhook + credenciales de Meta Business verificado) — se construye junto con el resto del backend NestJS, no antes. Distinto de WhatsApp Business (la app gratis) que solo son links `wa.me` — eso ya está en el frontend, sin backend.

`aws-amplify` y `aws-blocks` quedan instaladas pero dejan de ser la ruta activa — no se usan en este proyecto salvo que se decida lo contrario.

### Metodología

**Contract-first**: terminar `customer-app` completamente mock-funcional (todos los flujos de usuario funcionando con datos falsos, sin huecos) ANTES de escribir el backend. La capa `lib/repositories/` de `customer-app` ya está diseñada para esto — cada método de repositorio define el contrato que el backend real va a tener que cumplir. Cuando el backend esté listo, solo se cambia el datasource (de mock a HTTP), no el resto de la app.

Orden de fases:
1. ✅ `customer-app` 100% mock-funcional (flujos completos: tienda, cuenta, checkout, panel, rendimiento).
2. ✅ Contrato de API derivado de los repositorios existentes — hecho para los 8 dominios ya migrados (`branches`/`products`/`membership-tiers`/`users`/`announcements`/`social`/`performance`/`community`, ver punto 4).
3. ⏳ Fundaciones AWS vía Terraform: código en `infra/` ya existe de una vuelta anterior, pero está **destruido** (ver "Nota operativa" abajo) — sin aplicar todavía.
4. ✅ Backend NestJS: `apps/backend` — 8 dominios migrados (`branches`/`products`/`memberships`/`users` + `announcements`/`social`/`performance`/`community`, esta segunda tanda 2026-09-12) + Prisma (Postgres local vía Homebrew, sin Docker en esta máquina) + auth con Cognito (`CognitoAuthGuard`, sin probar contra un User Pool real todavía porque la infra está destruida — sí probado end-to-end con `CognitoVerifierService` sobreescrito en tests). Ver `apps/backend/CLAUDE.md` para el detalle completo, incluida la decisión de usar Prisma 6 en vez de 7 y el tratamiento especial de `performance` (seed fijo, sin captura real de entrenamientos todavía) y `community` (el único de los 4 nuevos con lógica real, feed sin datos semilla).
5. ⏳ (parcial) Conectar: swap de datasource mock → HTTP en `customer-app` (todavía no se tocó, el backend corre standalone) sigue pendiente. ✅ Docker validado (2026-09-12) — `apps/backend/Dockerfile`, build + contenedor corriendo localmente contra Postgres real, ver su CLAUDE.md. Falta: push a ECR y correr en ECS Fargate real (ambos necesitan la infra de Terraform aplicada), CI/CD.
6. ⏳ Pagos (Stripe/PayPal/Mercado Pago) sobre la base ya funcional.
7. ⏳ `branch-app` y `owner-panel` (Fase 2/3 del negocio) reusando `apps/backend` y `packages/types`.

### Pendiente de decidir

- Qué pasa con socios/empleados si cierra una sucursal.
- Política de devoluciones/cancelaciones.

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

**Infra destruida a propósito (2026-09-10) para no pagar mientras no hay desarrollo activo.** `terraform destroy` en `infra/envs/dev` corrido — cero recursos vivos en la cuenta AWS (verificado: `terraform state list` vacío, `list-user-pools` vacío). El código en `infra/` sigue intacto, solo hace falta volver a aplicarlo. Para retomar:

1. **Antes del apply** — crear las apps OAuth reales y llenar `infra/envs/dev/terraform.tfvars` (copiar de `terraform.tfvars.example`, ese archivo no está en git): OAuth client de Google (console.cloud.google.com) y app de Meta for Developers (developers.facebook.com) con producto "Facebook Login". El redirect URI exacto a registrar en ambos está documentado en `terraform.tfvars.example`. Sin esto, `terraform apply` igual funciona pero sin los IdPs de Google/Facebook (quedan vacíos por default, ver `infra/modules/cognito/variables.tf`).
2. `cd infra/envs/dev && terraform apply` — recrea el User Pool y los 3 App Clients (`web`, `owner_panel`, `branch_app`) con IDs NUEVOS (no van a coincidir con los que están en el historial de este chat).
3. Actualizar `.env.local` en `apps/customer-app`, `apps/owner-panel` y `apps/branch-app` con los IDs nuevos (`terraform output`) — los `.env.local` viejos van a tener valores obsoletos. `customer-app` además necesita `COGNITO_DOMAIN` (`terraform output cognito_domain`, nuevo desde el login social).
4. Recrear los 6 usuarios de prueba reales (`AdminCreateUser` + `AdminSetUserPassword --permanent`, y `AdminAddUserToGroup` para los que tienen rol) — la destrucción del User Pool los borró a todos:
   - `diego@mucholoco.mx` / `valeria@mucholoco.mx` — clientes (customer-app, sin grupo), passwords `Bestia123!`.
   - `rodrigo@mucholoco.mx` — grupo `owner`.
   - `ana@mucholoco.mx` — grupo `manager`. `luis@mucholoco.mx` — grupo `staff`. Ambos ya están en `branch-app/src/lib/staffDirectory.ts` (Roma Sur) — no hace falta tocar ese archivo.
   - `e2e.playwright@mucholoco.mx` — lo recrea solo `tests/e2e/global-setup.ts` de `customer-app` al correr `pnpm test:e2e`, no hace falta hacerlo a mano.
