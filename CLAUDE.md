# CLAUDE.md — Mucho Loco Gym (monorepo)

## Contexto del proyecto

Tienda y app de membresías para "Mucho Loco Gym" (cadena de 15 sucursales, CDMX). Proyecto de aprendizaje fullstack de Miguel — único desarrollador, sin equipo. El usuario está aprendiendo Next.js (viene de React) y AWS. Explicar conceptos nuevos ligándolos a lo que ya sabe de React.

## Estructura del monorepo

Gestionado con **pnpm workspaces + Turborepo**. Un único desarrollador, así que el monorepo prioriza compartir tipos/lógica de dominio sobre aislar equipos.

```
mucho-loco/
  apps/
    customer-app/       # Next.js 14 — tienda + app del socio (único app activo hoy)
    branch-app/         # futuro — Fase 1 (versión mínima) / Fase 2 (completa)
    owner-panel/        # futuro — Fase 1 (solo lectura) / Fase 2 (completo)
    backend/            # futuro — pendiente NestJS vs AWS Amplify/Lambda-native
  packages/
    types/              # @mucho-loco/types — tipos de dominio compartidos (Branch, Product, etc.)
```

Comandos desde la raíz:
```bash
pnpm install         # instala todo el workspace
pnpm dev             # turbo run dev — corre dev de todos los apps (o pnpm --filter <app> dev)
pnpm build           # turbo run build — respeta orden de dependencias entre paquetes
```

Cada app nuevo (`branch-app`, `owner-panel`, `backend`) tiene su propio `CLAUDE.md` con sus convenciones específicas cuando se cree. `apps/customer-app/CLAUDE.md` ya existe.

## Visión completa del proyecto (negocio)

Esto NO es solo una tienda: es el sistema completo de "Mucho Loco Gym", cadena de ~15 sucursales (se abren/cierran) que también vende productos propios (preentrenos, proteína, gomitas). Son 3 sistemas:

1. **Tienda + app del cliente** — hoy vive en `apps/customer-app`.
2. **App de sucursal** (staff) — pedidos a entregar, venta de mostrador, caja.
3. **Panel del dueño** (HQ) — estadísticas, inventario global, nómina.

### Reglas de negocio confirmadas

- **Membresía única para toda la cadena**: precio/promoción según la sucursal de inscripción, pero el QR de acceso funciona en cualquiera de las 15 sucursales.
- **QR de acceso**: código fijo, válido mientras la membresía esté vigente (no rota).
- **Pago recurrente de mensualidad**: si falla el cobro, hay periodo de gracia con avisos antes de suspender el acceso.
- **Inventario por sucursal**: cada sucursal sabe su stock físico real. Venta de mostrador descuenta del stock LOCAL de esa sucursal. Envíos a domicilio siempre salen de una bodega central única. "Recoger en gym" = la sucursal que el cliente elige al comprar.
- **Pagos en línea**: tarjeta, Mercado Pago, PayPal, Stripe. Efectivo solo aplica a venta de mostrador en sucursal, no en línea.
- **Control de dinero en sucursal**: corte de caja por turno/día, auditable desde el panel del dueño.
- **Roles en sucursal**: diferenciados — gerente (caja, reportes, inventario local) vs. mostrador (pedidos, cobro, QR).
- **Nómina**: cálculo completo (asistencia, deducciones, recibos), no solo registro de gasto.
- **Sin clases con reservación** (por ahora): acceso libre a pesas/máquinas. Coaches son parte del staff/ambiente, sin agenda con cupo.
- **Comunidad**: feed social básico entre socios (posts, likes, comentarios). Sin rankings ni conexión automática con el módulo Rendimiento por ahora.

### Fases del proyecto

- **Fase 1 (MVP)** — tienda en línea completa, registro/login (correo + redes), mapa de sucursales con precios/promos, membresía con pago recurrente + periodo de gracia, panel del socio (pedidos, QR, avisos de vencimiento), feed social básico, versión MÍNIMA de sucursal (marcar pedidos de "recoger" como entregados, vender en mostrador descontando stock local, validar QR), y **panel del dueño básico** (estadísticas de ventas, clientes activos por sucursal, inventario global consolidado — solo lectura, sin nómina ni corte de caja todavía).
- **Fase 2** — app de sucursal completa (corte de caja, roles gerente/mostrador) + panel del dueño completo (transferencias de inventario, gastos).
- **Fase 3** — nómina completa (asistencia, deducciones, recibos), reportes ejecutivos avanzados.

### Arquitectura de backend (decidida 2026-08-30)

**NestJS sobre AWS nativo** (no Amplify). Objetivo explícito del usuario: aprender AWS de forma realista, como en una empresa seria — no el camino más corto (Amplify/serverless-first), sino el stack que se encuentra en un backend de producción típico.

- **NestJS** como monolito modular (no microservicios todavía — con un solo dev, microservicios agregan complejidad operativa sin beneficio real; los módulos de Nest ya dan el límite de dominio que permitiría separar después si hiciera falta).
- **PostgreSQL en RDS + Prisma** como ORM — no DynamoDB. Relacional encaja mejor con el dominio (sucursales, membresías, inventario, nómina tienen relaciones fuertes) y es lo que se ve en la mayoría de backends NestJS reales.
- **Cognito User Pools** para auth (emite JWT, NestJS lo valida vía Passport) — se mantiene aunque no se use Amplify; Cognito es independiente de Amplify.
- **Docker → ECR → ECS Fargate detrás de un ALB** para desplegar NestJS — el patrón estándar para un servidor persistente en AWS (no Lambda, que es para funciones cortas/stateless).
- **AWS CDK (TypeScript)** como infraestructura como código — mismo lenguaje que el resto del monorepo.
- **@nestjs/swagger** para documentar la API (OpenAPI) — librería oficial de Nest, no requiere skill aparte.
- Frontend (`customer-app`) se despliega en **Vercel**, no en AWS — es lo que hace la mayoría de empresas reales con stack Next.js + backend propio en AWS, y mantiene el foco de aprendizaje de AWS en el backend/infra en vez de en hosting de frontend.
- **WhatsApp Business Platform (Cloud API de Meta)** para notificaciones — avisos de vencimiento de membresía/periodo de gracia, pedido listo para retiro, confirmación de pago. Se elige sobre email porque WhatsApp es el canal dominante en México. Requiere un módulo de backend (webhook + credenciales de Meta Business verificado) — se construye junto con el resto del backend NestJS, no antes. Distinto de WhatsApp Business (la app gratis) que solo son links `wa.me` — eso ya está en el frontend, sin backend.

`aws-amplify` y `aws-blocks` quedan instaladas pero dejan de ser la ruta activa — no se usan en este proyecto salvo que se decida lo contrario.

### Metodología

**Contract-first**: terminar `customer-app` completamente mock-funcional (todos los flujos de usuario funcionando con datos falsos, sin huecos) ANTES de escribir el backend. La capa `lib/repositories/` de `customer-app` ya está diseñada para esto — cada método de repositorio define el contrato que el backend real va a tener que cumplir. Cuando el backend esté listo, solo se cambia el datasource (de mock a HTTP), no el resto de la app.

Orden de fases:
1. `customer-app` 100% mock-funcional (flujos completos: tienda, cuenta, checkout, panel, rendimiento).
2. Definir contrato de API (DTOs/OpenAPI) a partir de los repositorios ya existentes.
3. Fundaciones AWS vía CDK: VPC, RDS Postgres, Cognito User Pool.
4. Backend NestJS: módulos de dominio (branches, products, orders, memberships) + Prisma + auth con Cognito.
5. Conectar: swap de datasource mock → HTTP en `customer-app`, Docker + ECS Fargate, CI/CD.
6. Pagos (Stripe/PayPal/Mercado Pago) sobre la base ya funcional.
7. `branch-app` y `owner-panel` (Fase 2/3 del negocio) reusando `apps/backend` y `packages/types`.

### Pendiente de decidir

- Qué pasa con socios/empleados si cierra una sucursal.
- Qué redes sociales exactas para login social.
- Política de devoluciones/cancelaciones.

### Skills instaladas para este proyecto (`.agents/skills/`, ver `skills-lock.json`)

Viven en la raíz del monorepo — aplican a todos los apps, no solo a `customer-app`.

- `stripe-best-practices`, `stripe-projects` (oficial Stripe) — pagos con tarjeta/Stripe.
- `paypal-integration` — pagos PayPal.
- `aws-auth` (oficial AWS) — Cognito.
- `aws-cdk` (oficial AWS) — infraestructura como código.
- `aws-containers` (oficial AWS) — Docker/ECS/Fargate.
- `prisma-database-setup` (oficial Prisma) — ORM + PostgreSQL.
- `database-schema-designer` — diseño de esquema multi-sucursal.
- `nestjs-best-practices`, `nestjs-patterns`, `frontend-design`, `vercel-composition-patterns`, `vercel-react-native-skills`, `vercel-react-view-transitions`.
- `tailwind-css` — se adapta a la versión de Tailwind instalada (hoy v3 en `customer-app`); no asume v4 aunque su metadata lo mencione.
- `aws-amplify`, `aws-blocks` — instaladas pero no activas (ruta serverless-first no elegida).

No hay skill confiable instalable para Mercado Pago, inventario/POS multi-sucursal ni mapa de sucursales — se diseñan directo con el usuario.

### Nota operativa

Solo `README.md` estaba trackeado en git antes de la migración a monorepo (todo el resto de `apps/customer-app` nunca se hizo `git add`). Revisar `git status` antes del próximo commit para confirmar qué se está agregando.
