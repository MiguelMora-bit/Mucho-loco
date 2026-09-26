# Specs de Mucho Loco

Todas las funcionalidades del proyecto, por área. Los specs **001–021** se escribieron antes de construir la funcionalidad (Spec Kit desde el 2026-09-23); los **022–049** son **retroactivos**: documentan lo que ya existía, con las decisiones tomadas y un `tasks.md` que liga cada requisito con el test que lo verifica (una tarea abierta es un hueco real).

Varios specs tocan más de un app (casi todos también el backend); cada uno aparece en el área de quien lo usa.

## Socio — customer-app y mobile-app

| Spec | Tipo | Tareas | Abiertas |
|---|---|---|---|
| [001-member-cfdi-invoicing](001-member-cfdi-invoicing/spec.md) — Facturación del socio (CFDI) en la web | nuevo | 44/44 |  |
| [002-mobile-cfdi-invoicing](002-mobile-cfdi-invoicing/spec.md) — Facturación del socio (CFDI) en la app móvil | nuevo | 20/20 |  |
| [005-stripe-billing-portal](005-stripe-billing-portal/spec.md) — Administrar la suscripción de membresía (portal de Stripe) | nuevo | 12/12 |  |
| [007-web-signup-phone](007-web-signup-phone/spec.md) — El registro web pide el teléfono | nuevo | 5/5 |  |
| [010-performance-color-token](010-performance-color-token/spec.md) — Colores de rendimiento como nombre de paleta, no CSS | nuevo | 5/5 |  |
| [011-membership-plan-label](011-membership-plan-label/spec.md) — Nombre del plan de membresía traducido | nuevo | 7/7 |  |
| [013-dashboard-visit-stats](013-dashboard-visit-stats/spec.md) — Cifras reales en el inicio del panel | nuevo | 7/7 |  |
| [015-member-phone](015-member-phone/spec.md) — Teléfono del socio — completarlo y cambiarlo | nuevo | 7/7 |  |
| [016-attendance-heatmap](016-attendance-heatmap/spec.md) — Heatmap de asistencia real | nuevo | 7/7 |  |
| [017-workout-log](017-workout-log/spec.md) — Registrar entrenamientos | nuevo | 9/9 |  |
| [018-performance-summary](018-performance-summary/spec.md) — Resumen y récords de Rendimiento, del socio | nuevo | 6/6 |  |
| [021-web-workout-log](021-web-workout-log/spec.md) — Registrar entrenamientos desde la web | nuevo | 4/4 |  |
| [022-catalog-and-cart](022-catalog-and-cart/spec.md) — Tienda: catálogo, detalle y carrito | retroactivo | 4/5 | 1 |
| [023-checkout-and-orders](023-checkout-and-orders/spec.md) — Checkout y pedidos de la tienda | retroactivo | 6/6 |  |
| [024-member-auth](024-member-auth/spec.md) — Registro e inicio de sesión del socio | retroactivo | 6/6 |  |
| [025-social-login](025-social-login/spec.md) — Inicio de sesión con Google y Facebook | retroactivo | 3/4 | 1 |
| [026-membership-billing](026-membership-billing/spec.md) — Contratar y pagar la membresía | retroactivo | 5/6 | 1 |
| [027-member-dashboard](027-member-dashboard/spec.md) — Panel del socio | retroactivo | 4/5 | 1 |
| [028-community](028-community/spec.md) — Comunidad entre socios | retroactivo | 3/3 |  |
| [029-landing](029-landing/spec.md) — Landing: sucursales, planes, avisos y redes | retroactivo | 5/6 | 1 |
| [030-i18n](030-i18n/spec.md) — Idiomas (español e inglés) y fechas | retroactivo | 3/3 |  |

## Sucursal — branch-app

| Spec | Tipo | Tareas | Abiertas |
|---|---|---|---|
| [003-counter-self-invoice-ticket](003-counter-self-invoice-ticket/spec.md) — Clave de autofactura en el ticket de mostrador | nuevo | 16/16 |  |
| [006-counter-renewal-subscription-guard](006-counter-renewal-subscription-guard/spec.md) — Renovación en mostrador sin doble cobro ni días perdidos | nuevo | 8/8 |  |
| [009-counter-card-type](009-counter-card-type/spec.md) — Crédito o débito en los cobros con tarjeta de mostrador | nuevo | 7/7 |  |
| [012-member-check-ins](012-member-check-ins/spec.md) — Registro de entradas (check-in) | nuevo | 10/10 |  |
| [019-counter-overdue-payment](019-counter-overdue-payment/spec.md) — Pagar en mostrador el atraso de una suscripción | nuevo | 5/5 |  |
| [020-shared-qr-alerts](020-shared-qr-alerts/spec.md) — Alertas de QR compartido | nuevo | 6/6 |  |
| [031-staff-auth-roles](031-staff-auth-roles/spec.md) — Acceso del personal y roles | retroactivo | 4/4 |  |
| [032-pickup-orders](032-pickup-orders/spec.md) — Pedidos para recoger en sucursal | retroactivo | 3/3 |  |
| [033-counter-sale](033-counter-sale/spec.md) — Venta de mostrador | retroactivo | 3/3 |  |
| [034-cash-register](034-cash-register/spec.md) — Caja: turnos y corte | retroactivo | 4/5 | 1 |
| [035-counter-memberships](035-counter-memberships/spec.md) — Altas y renovaciones de membresía en mostrador | retroactivo | 4/4 |  |
| [036-access-validation](036-access-validation/spec.md) — Validar el acceso en la puerta | retroactivo | 4/4 |  |
| [037-branch-reports](037-branch-reports/spec.md) — Reportes e inventario local del gerente | retroactivo | 3/3 |  |
| [038-attendance](038-attendance/spec.md) — Asistencia del personal | retroactivo | 3/4 | 1 |

## Dueño — owner-panel

| Spec | Tipo | Tareas | Abiertas |
|---|---|---|---|
| [004-owner-cfdi-panel](004-owner-cfdi-panel/spec.md) — Facturas (CFDI) en el panel del dueño | nuevo | 14/14 |  |
| [014-branch-traffic](014-branch-traffic/spec.md) — Afluencia por sucursal en el panel del dueño | nuevo | 5/5 |  |
| [039-owner-dashboard](039-owner-dashboard/spec.md) — Resumen de la cadena e inventario global | retroactivo | 3/3 |  |
| [040-inventory-transfers](040-inventory-transfers/spec.md) — Transferencias de inventario entre sucursales | retroactivo | 3/3 |  |
| [041-expenses](041-expenses/spec.md) — Gastos | retroactivo | 3/4 | 1 |
| [042-payroll](042-payroll/spec.md) — Nómina | retroactivo | 4/5 | 1 |
| [043-executive-reports](043-executive-reports/spec.md) — Reportes ejecutivos | retroactivo | 1/1 |  |
| [044-home-shipments](044-home-shipments/spec.md) — Envíos a domicilio desde la bodega | retroactivo | 3/3 |  |

## Plataforma — backend, avisos, infraestructura

| Spec | Tipo | Tareas | Abiertas |
|---|---|---|---|
| [008-shipment-whatsapp-notice](008-shipment-whatsapp-notice/spec.md) — Aviso de WhatsApp "tu pedido va en camino" | nuevo | 6/6 |  |
| [045-charges-ledger](045-charges-ledger/spec.md) — Registro de cobros | retroactivo | 4/4 |  |
| [046-cfdi-core](046-cfdi-core/spec.md) — Facturación CFDI 4.0 (núcleo del backend) | retroactivo | 4/5 | 1 |
| [047-whatsapp-notices](047-whatsapp-notices/spec.md) — Avisos por WhatsApp | retroactivo | 3/4 | 1 |
| [048-api-platform](048-api-platform/spec.md) — Plataforma de la API y contrato compartido | retroactivo | 4/5 | 1 |
| [049-deploy-infra](049-deploy-infra/spec.md) — Infraestructura y despliegue | retroactivo | 5/6 | 1 |

## Huecos abiertos

Cada tarea abierta de los specs retroactivos es algo que hoy no está verificado o no existe. Ver el `tasks.md` de cada spec.

- **022** Test unitario del carrito de la web (`cart.store.ts`): hoy solo lo cubre el e2e de compra.
- **025** Login social de punta a punta con Google y Facebook reales (requiere crear las apps OAuth).
- **026** Renovación natural al fin de periodo contra Stripe real (test clocks).
- **027** Guardar las preferencias de avisos de Configuración y respetarlas en el backend (hoy son solo visuales).
- **029** FR-003 · test automatizado del mapa con y sin llave de Google Maps (hoy solo revisión visual).
- **034** Auditoría de cortes desde owner-panel (pedido en el CLAUDE.md raíz: "auditable desde el panel del dueño").
- **038** Pantalla para que el gerente corrija una salida olvidada.
- **041** Editar o borrar un gasto capturado por error.
- **042** Crear la siguiente quincena (endpoint + pantalla): sin esto la nómina se detiene tras cerrar la quincena sembrada.
- **046** Probar contra el sandbox de Facturapi (requiere la cuenta).
- **047** Probar contra la Cloud API de Meta con plantillas aprobadas.
- **048** Instalar y montar `@nestjs/swagger` (documentación OpenAPI decidida en el CLAUDE.md raíz).
- **049** Reducir la imagen del backend (requiere Docker).
