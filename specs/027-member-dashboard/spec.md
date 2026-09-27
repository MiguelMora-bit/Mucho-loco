# Feature Specification: Panel del socio

**Feature Branch**: `027-member-dashboard` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo del panel del socio en la web (`/dashboard`) y del panel de Cuenta del móvil: membresía, QR de acceso, visitas, pedidos y perfil.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- La web es un Server Component que lee perfil, membresía, visitas, pedidos y feed; `DashboardClient` solo maneja la interacción (secciones Inicio, Mi acceso, Mis pedidos, Comunidad, Mi perfil, Configuración).
- El QR de acceso es el `accessCode` fijo de la membresía (no rota): el mismo que branch-app escanea (2026-09-10). El móvil lo abre a pantalla completa con el brillo al máximo.
- Los avisos del inicio dependen del estado: sin membresía → elegir plan; gracia → pagar la factura; suspendida → reactivar; por vencer (sin suscripción) → renovar; con suscripción → "se renueva sola" y administrar en el portal de Stripe (spec 005).
- Visitas, racha y demás cifras salen de las entradas reales (specs 012–013); el plan se traduce (spec 011); el teléfono se completa ahí (spec 015).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver mi estado y mi QR (Priority: P1)

El socio ve su plan, sucursal, vencimiento y estado, y muestra su QR en la puerta.

**Independent Test**: walkthrough del móvil ("el QR de acceso es el código fijo del socio"); `apps/customer-app/tests/e2e/auth.spec.ts` (panel tras login).

**Acceptance Scenarios**:

1. **Given** una membresía activa, **When** abre el panel, **Then** ve plan, sucursal y días restantes.
2. **Given** en la puerta, **When** abre su QR, **Then** ve el código fijo de su membresía (en el móvil, con el brillo al máximo).
3. **Given** una membresía vencida, **When** abre el panel, **Then** ve el aviso de suspendida y el QR deshabilitado.

### User Story 2 - Mis pedidos y visitas (Priority: P2)

Historial de pedidos con estado y de visitas con sucursal y hora.

**Independent Test**: `apps/customer-app/lib/repositories/user.repository.test.ts`; `shop-checkout.spec.ts`.

**Acceptance Scenarios**:

1. **Given** un pedido recién hecho, **When** abre Mis pedidos, **Then** lo ve con su estado.
2. **Given** una visita sin salida registrada, **When** ve su historial, **Then** la duración aparece como "—".

### User Story 3 - Perfil y configuración (Priority: P3)

Datos personales, membresía y cambio de idioma.

**Independent Test**: walkthrough del móvil ("cambiar a inglés") y `lib/i18n-href.test.ts`.

**Acceptance Scenarios**:

1. **Given** el perfil, **When** lo abre, **Then** ve nombre, correo, teléfono y su membresía.
2. **Given** Configuración, **When** cambia a inglés, **Then** todo el panel se pinta en inglés.

### Edge Cases

- Socio sin membresía: el panel no truena (404 del backend = `null`).
- Pedido a domicilio: sin QR de retiro (spec 023).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El panel MUST mostrar la membresía (plan traducido, sucursal, vencimiento, estado efectivo) o la invitación a contratar.
- **FR-002**: El QR MUST ser el `accessCode` de la membresía, sin rotar.
- **FR-003**: El panel MUST mostrar el aviso que corresponde al estado (sin membresía, gracia, suspendida, por vencer, renovación cancelada, se renueva sola).
- **FR-004**: El panel MUST listar pedidos y visitas del socio autenticado.
- **FR-005**: Configuración MUST permitir cambiar de idioma.

### Key Entities

- UserProfile, MembershipInfo, Visit, Order.

## Success Criteria *(mandatory)*

- **SC-001**: El QR que ve el socio siempre valida en branch-app (mismo código de punta a punta).

## Assumptions


## Fuera de alcance / pendiente conocido

- ~~Los interruptores de avisos de Configuración son solo visuales~~ ✅ spec 053 (2026-09-26): se guardan (web y móvil) y el backend omite lo apagado.
- El cumpleaños ya no se captura en el registro (spec 007); el perfil lo oculta si falta.
