# Feature Specification: Inicio de sesión con Google y Facebook

**Feature Branch**: `025-social-login` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo del login social del socio en la web y el móvil (decidido 2026-09-11).

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Solo para socios (app clients `web` y `mobile`); staff, gerente y dueño siguen con correo y contraseña.
- Hosted UI de Cognito con IdPs `Google` y `Facebook` (`infra/modules/cognito`); authorization code + PKCE (S256), cliente público sin secreto.
- `identity_provider` en el authorize salta el selector de Cognito y va directo al consentimiento del proveedor.
- Web: `/api/auth/social/start` genera PKCE + `state` (nonce + ruta de regreso) en una cookie httpOnly de vida corta (`ml_oauth`); `/api/auth/social/callback` valida el nonce, canjea el code y deja la misma cookie `ml_session` que el login normal.
- Móvil: `expo-auth-session` genera PKCE y valida `state`; el canje del code lo hace `lib/auth/cognito.ts`. Regreso por `mucholoco://auth/callback`.
- Sin vincular cuentas: el mismo correo por Google, Facebook o contraseña son usuarios distintos en Cognito (aceptado).
- Las credenciales de Google/Facebook viven en `infra/envs/dev/terraform.tfvars` (fuera de git); sin ellas los botones no aparecen.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar con Google o Facebook (Priority: P1)

Un botón por proveedor; tras aceptar en el proveedor, el socio queda con sesión en su panel.

**Independent Test**: `apps/customer-app/tests/e2e/social-login.spec.ts` (redirect al authorize correcto y fallas cerradas) y `app/api/auth/social/*/route.test.ts`.

**Acceptance Scenarios**:

1. **Given** el botón de Google, **When** lo pulsa, **Then** va directo al authorize de Cognito con `identity_provider=Google` y PKCE.
2. **Given** un callback sin code o state, **When** llega, **Then** vuelve a /account?error=SOCIAL_LOGIN_FAILED.
3. **Given** un callback con error del proveedor, **When** llega, **Then** falla cerrado sin intentar el canje.

### Edge Cases

- Proveedor no soportado en `/start`: regresa a /account en vez de ir a Cognito.
- Un socio de login social no trae teléfono: lo completa en su panel (spec 015).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La web MUST generar PKCE y un `state` con nonce por intento, y validar el nonce en el callback (CSRF).
- **FR-002**: El canje del code MUST hacerse sin secreto (cliente público) y verificar el ID token antes de crear la sesión.
- **FR-003**: Cualquier falla del flujo MUST terminar en /account con `SOCIAL_LOGIN_FAILED` traducido.
- **FR-004**: Los botones MUST mostrarse solo si hay dominio de Hosted UI configurado.

## Success Criteria *(mandatory)*

- **SC-001**: Ninguna ruta del callback crea sesión sin nonce válido.

## Assumptions

- Apps OAuth reales creadas en Google Cloud y Meta for Developers.

## Fuera de alcance / pendiente conocido

- Probar de punta a punta con proveedores reales (no se han creado las apps OAuth).
- Móvil: probar en un build de desarrollo (no funciona en Expo Go: su scheme `exp://` no se puede registrar).
