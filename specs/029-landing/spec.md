# Feature Specification: Landing: sucursales, planes, avisos y redes

**Feature Branch**: `029-landing` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de la página pública (web) y la pestaña de Inicio y Sucursales del móvil.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- 15 sucursales con dirección, horario, teléfono, precio, promos y ubicación; el backend las siembra con los mismos ids que el mock.
- Mapa: Google Maps (`@vis.gl/react-google-maps`) si hay `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; sin llave, una imagen de OpenStreetMap con los marcadores posicionados. El móvil abre la app de mapas del teléfono ("Cómo llegar").
- El contenido del landing sin repositorio propio va por stores precargados por el Server Component (avisos, planes, redes, feed) — hidratados al montar para no mostrar loader.
- Sin formulario de contacto: WhatsApp (`wa.me`) es el canal (2026-08-30).
- Los avisos se ordenan por fecha en el backend; el mock los trae en orden escrito a mano (diferencia conocida, cosmética).
- SEO: `canonical` y `hreflang` por idioma (`buildAlternates`); las páginas de cuenta no se indexan.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conocer las sucursales (Priority: P1)

El visitante ve las 15 sucursales en lista y mapa, con precio y promos.

**Independent Test**: `apps/customer-app/tests/integration/landing.contract.test.ts` (mock vs backend) y `apps/backend/test/app.e2e-spec.ts` ("GET /branches returns the 15 seeded branches").

**Acceptance Scenarios**:

1. **Given** el landing, **When** abre Sucursales, **Then** ve las 15 con su precio.
2. **Given** una sucursal con promo, **When** la ve, **Then** ve la promo destacada (`/branches/featured`).
3. **Given** el móvil, **When** toca "Cómo llegar", **Then** se abre la app de mapas del teléfono.

### User Story 2 - Ver planes y precios (Priority: P1)

La sección de membresías muestra los dos planes con sus beneficios y precio, y lleva a contratar.

**Independent Test**: `landing.contract.test.ts` (tiers y factores).

**Acceptance Scenarios**:

1. **Given** una sucursal elegida, **When** ve los planes, **Then** ve el precio de 1 sucursal de esa sucursal y el fijo de 15.

### User Story 3 - Avisos, redes y contacto (Priority: P2)

Tablero de avisos (con splash descartable), redes sociales con su feed y contacto por WhatsApp.

**Independent Test**: `apps/customer-app/tests/e2e/navigation.spec.ts` (el splash se descarta sin bloquear la navegación); `lib/repositories/{announcement,social}.repository.test.ts`.

**Acceptance Scenarios**:

1. **Given** el splash de avisos abierto, **When** lo cierra, **Then** puede seguir navegando.
2. **Given** Contacto, **When** toca WhatsApp, **Then** se abre `wa.me` con el mensaje prellenado.

### Edge Cases

- Sin llave de Google Maps: el mapa sigue siendo útil con la imagen estática.
- Una sucursal sin promo no aparece en destacadas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sucursales, planes, avisos, redes y feed de marketing MUST servirse por repositorios (mock y HTTP) y el backend MUST exponerlos públicos (sin token).
- **FR-002**: El contrato público MUST ser idéntico en mock y backend (test de contrato campo por campo).
- **FR-003**: El mapa MUST funcionar con y sin llave de Google Maps.
- **FR-004**: El splash de avisos MUST poder descartarse sin bloquear la navegación.
- **FR-005**: Cada página pública MUST declarar `canonical` y alternativas por idioma.

### Key Entities

- Branch, BranchPromo, MembershipTier, Announcement, SocialLink, FeedPost.

## Success Criteria *(mandatory)*

- **SC-001**: Mock y backend dan el mismo landing (salvo el orden de avisos, documentado).

## Assumptions

- Los datos de sucursales son de ejemplo hasta que el negocio confirme los reales.

## Fuera de alcance / pendiente conocido

- Prioridad para ordenar el tablero de avisos (hoy por fecha).
- Mapa nativo en el móvil (`react-native-maps`).
