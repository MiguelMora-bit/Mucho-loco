# Feature Specification: Registro e inicio de sesión del socio

**Feature Branch**: `024-member-auth` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de la cuenta del socio con Cognito en la web y el móvil, y de cómo el backend reconoce al socio.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Un solo User Pool de Cognito para toda la cadena; los socios no tienen grupo, staff/gerente/dueño sí (2026-09-09).
- Web: Cognito se llama solo desde Route Handlers (`/api/auth/*`); el ID token vive en la cookie httpOnly `ml_session` y el refresh en `ml_refresh`.
- Toda página o ruta protegida verifica el JWT (firma, expiración, issuer, audience contra el JWKS) con `jose` — una cookie fabricada no sirve (auditoría 2026-09-10).
- Móvil: `CognitoAuthService` habla con Cognito directo (app client público `mobile`); sesión en el llavero del sistema (SecureStore), refresh 5 min antes de vencer con un solo refresh en vuelo; logout = `RevokeToken`. `MockAuthService` es el default (2026-09-12).
- El registro pide teléfono (móvil desde el inicio; web desde el spec 007) y lo manda como `phone_number`.
- Backend: `CognitoAuthGuard` global; la identidad sale del token, nunca de un parámetro. El primer request de un `sub` nuevo crea al socio (sin membresía, desde 2026-09-13).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear cuenta y confirmarla (Priority: P1)

Registro con nombre, correo, teléfono y contraseña; código por correo; al confirmar entra solo.

**Independent Test**: `app/api/auth/{register,confirm,resend-code}/route.test.ts`; walkthrough del móvil (registro con código mock `123456`).

**Acceptance Scenarios**:

1. **Given** un teléfono que no es de 10 dígitos, **When** se registra, **Then** ve el error antes de crear la cuenta.
2. **Given** un código incorrecto, **When** confirma, **Then** ve "Código incorrecto" traducido.
3. **Given** el código correcto, **When** confirma, **Then** entra a su panel sin volver a escribir la contraseña.

### User Story 2 - Iniciar y cerrar sesión (Priority: P1)

Login con correo y contraseña; las rutas de cuenta piden sesión y regresan a donde iba.

**Independent Test**: `apps/customer-app/tests/e2e/auth.spec.ts` contra Cognito real (2026-09-26).

**Acceptance Scenarios**:

1. **Given** una contraseña incorrecta, **When** inicia sesión, **Then** ve el error real de Cognito traducido.
2. **Given** sin sesión, **When** abre /dashboard, **Then** lo manda a /account?next=/dashboard y vuelve tras el login.
3. **Given** una cookie fabricada, **When** abre /dashboard o llama a /api/orders, **Then** se rechaza.
4. **Given** sesión abierta, **When** cierra sesión, **Then** una ruta protegida vuelve a pedir login.

### User Story 3 - Sesión que dura (Priority: P2)

La sesión se renueva sola sin pedir contraseña hasta que vence el refresh token (30 días).

**Independent Test**: `auth.spec.ts` ("refresh renews ml_session") y `apps/mobile-app/src/lib/auth/*.test.ts`.

**Acceptance Scenarios**:

1. **Given** un ID token por vencer, **When** la app sigue abierta, **Then** se renueva con REFRESH_TOKEN_AUTH.
2. **Given** un refresh revocado, **When** intenta renovar, **Then** se cierra la sesión (en el móvil, un fallo de red NO la cierra).

### Edge Cases

- Cuenta sin confirmar que intenta entrar (móvil): se reenvía el código y se lleva a la pantalla de confirmación.
- Cuatro requests simultáneas de un socio nuevo: se crea una sola vez (choque de índice único tratado como "ya existe").
- El correo ya ligado a otro `sub`: 409 `EMAIL_ALREADY_LINKED`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El registro MUST aplicar la política del User Pool (8+, mayúscula, minúscula, número) y exigir teléfono válido (`toE164`).
- **FR-002**: La web MUST guardar la sesión en cookies httpOnly y verificar el JWT en cada página/ruta protegida (`PROTECTED_PATHS`).
- **FR-003**: El móvil MUST guardar la sesión en el llavero y renovarla antes de vencer, con un solo refresh a la vez.
- **FR-004**: Los errores de Cognito MUST mostrarse traducidos a partir de un código (`cognitoErrorCode`), nunca el mensaje crudo.
- **FR-005**: El backend MUST aceptar solo ID tokens válidos de los app clients configurados (`COGNITO_CLIENT_IDS`) y responder 401 sin token.
- **FR-006**: El backend MUST crear al socio en su primer request, sin membresía, con el teléfono del token si trae.

### Key Entities

- Sesión (ID token, refresh token, vencimiento), User (`cognitoSub`, `email`, `name`, `phone`).

## Success Criteria *(mandatory)*

- **SC-001**: Una sesión fabricada nunca pasa (probado con cookie y con localStorage editados).
- **SC-002**: Registro → panel en un solo flujo, sin segundo login.

## Assumptions

- El User Pool existe (`infra/modules/cognito`); hoy se levanta solo para probar y se destruye.

## Fuera de alcance / pendiente conocido

- Verificar el teléfono con código (decidido 2026-09-26: esperar a WhatsApp Business).
- Rotación de refresh token en el móvil.
