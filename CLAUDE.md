# CLAUDE.md — Mucho Loco Gym (monorepo)

## Contexto del proyecto

Tienda y app de membresías para "Mucho Loco Gym" (cadena de 15 sucursales, CDMX). Proyecto de aprendizaje fullstack de Miguel — único desarrollador, sin equipo. El usuario está aprendiendo Next.js (viene de React) y AWS. Explicar conceptos nuevos ligándolos a lo que ya sabe de React.

## Estructura del monorepo

Gestionado con **pnpm workspaces + Turborepo**. Un único desarrollador, así que el monorepo prioriza compartir tipos/lógica de dominio sobre aislar equipos.

```
mucho-loco/
  apps/
    tienda-cliente/     # Next.js 14 — tienda + app del socio (único app activo hoy)
    app-sucursal/       # futuro — Fase 1 (versión mínima) / Fase 2 (completa)
    panel-dueno/        # futuro — Fase 1 (solo lectura) / Fase 2 (completo)
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

Cada app nuevo (`app-sucursal`, `panel-dueno`, `backend`) tiene su propio `CLAUDE.md` con sus convenciones específicas cuando se cree. `apps/tienda-cliente/CLAUDE.md` ya existe.

## Visión completa del proyecto (negocio)

Esto NO es solo una tienda: es el sistema completo de "Mucho Loco Gym", cadena de ~15 sucursales (se abren/cierran) que también vende productos propios (preentrenos, proteína, gomitas). Son 3 sistemas:

1. **Tienda + app del cliente** — hoy vive en `apps/tienda-cliente`.
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

### Pendiente de decidir

- Qué pasa con socios/empleados si cierra una sucursal.
- Qué redes sociales exactas para login social.
- Política de devoluciones/cancelaciones.
- **Arquitectura de backend**: este repo ya trae skills de NestJS instaladas (`nestjs-best-practices`, `nestjs-patterns`), pero el plan original apuntaba a AWS nativo (Cognito/DynamoDB/Lambda) y también se instalaron skills de AWS Amplify. Falta decidir NestJS vs. Amplify/Lambda-native antes de avanzar con el backend — son dos enfoques distintos (servidor persistente vs. serverless-first) y no deberían mezclarse a medias.

### Skills instaladas para este proyecto (`.agents/skills/`, ver `skills-lock.json`)

Viven en la raíz del monorepo — aplican a todos los apps, no solo a `tienda-cliente`.

- `stripe-best-practices`, `stripe-projects` (oficial Stripe) — pagos con tarjeta/Stripe.
- `paypal-integration` — pagos PayPal.
- `aws-amplify`, `aws-blocks`, `aws-auth` (oficial AWS) — backend AWS.
- `database-schema-designer` — diseño de esquema multi-sucursal.
- `nestjs-best-practices`, `nestjs-patterns`, `frontend-design`, `vercel-composition-patterns`, `vercel-react-native-skills`, `vercel-react-view-transitions`.

No hay skill confiable instalable para Mercado Pago, inventario/POS multi-sucursal ni mapa de sucursales — se diseñan directo con el usuario.

### Nota operativa

Solo `README.md` estaba trackeado en git antes de la migración a monorepo (todo el resto de `apps/tienda-cliente` nunca se hizo `git add`). Revisar `git status` antes del próximo commit para confirmar qué se está agregando.
