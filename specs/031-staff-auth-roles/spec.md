# Feature Specification: Acceso del personal y roles

**Feature Branch**: `031-staff-auth-roles` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo del login de branch-app (mostrador y gerente) y owner-panel (dueño), y de cómo el backend autoriza por rol.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Mismo User Pool que los socios; el rol es el grupo de Cognito: `staff` (mostrador), `manager` (gerente), `owner` (dueño). Un socio sin grupo no entra a los apps internos.
- SPAs sin servidor: Cognito se llama directo desde el navegador con app clients públicos propios (`branch_app`, `owner_panel`); sesión en localStorage (`ml_staff_session`, `ml_owner_session`).
- `ProtectedRoute` verifica el ID token contra el JWKS en cada acceso y re-deriva rol y sucursal del token: editar la sesión en devtools no sirve (auditoría 2026-09-10).
- La sucursal del staff sale de `staffDirectory.ts` (correo → sucursal); un login válido sin sucursal se rechaza con `NO_BRANCH_ASSIGNED`.
- Backend: `@Roles()` con jerarquía staff < manager < owner (el dueño puede lo del gerente y del mostrador); un socio autenticado sin grupo recibe 403, sin token 401.
- Altas de personal con `AdminCreateUser` + `AdminAddUserToGroup` (nunca auto-registro).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar según mi rol (Priority: P1)

Mostrador, gerente y dueño entran con correo y contraseña y ven solo lo que su rol permite.

**Independent Test**: `apps/branch-app/tests/e2e/auth.spec.ts` y `apps/owner-panel/tests/e2e/auth.spec.ts` (login real, auto-escalación de rol, sesión fabricada); verificado en navegador con Cognito real el 2026-09-12 y 2026-09-26.

**Acceptance Scenarios**:

1. **Given** una cuenta de socio, **When** entra a branch-app, **Then** se rechaza con `NOT_STAFF`.
2. **Given** luis (staff), **When** entra, **Then** ve Pedidos, Mostrador, Acceso QR y Asistencia, sin Caja ni Reportes.
3. **Given** ana (manager), **When** entra, **Then** también ve Caja y Reportes.
4. **Given** una sesión editada a mano con `role: manager`, **When** abre la app, **Then** el rol se recalcula del token y no escala.

### User Story 2 - El backend autoriza por rol (Priority: P1)

Cada ruta interna declara el rol mínimo.

**Independent Test**: `apps/backend/test/branch-ops.e2e-spec.ts` ("roles").

**Acceptance Scenarios**:

1. **Given** un socio con token válido, **When** pide el inventario de una sucursal, **Then** 403.
2. **Given** sin token, **When** pide lo mismo, **Then** 401.
3. **Given** el dueño, **When** usa una ruta de mostrador, **Then** se le permite.

### Edge Cases

- Token vencido con refresh válido: se renueva solo; si el refresh falla, se limpia la sesión y vuelve al login.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El login interno MUST exigir el grupo del app (staff/manager en branch-app, owner en owner-panel).
- **FR-002**: Cada acceso MUST re-verificar el token y re-derivar rol y sucursal.
- **FR-003**: Las pantallas de gerente (Caja, Reportes) MUST requerir `manager`.
- **FR-004**: El backend MUST aplicar `@Roles` jerárquicos y distinguir 401 (sin sesión) de 403 (sin permiso).

### Key Entities

- StaffUser (`email`, `name`, `role`, `branchId`, `branchName`), OwnerUser.

## Success Criteria *(mandatory)*

- **SC-001**: Ninguna sesión fabricada o editada da más permisos que su token.

## Assumptions

- El directorio de sucursales del staff es un mock que reemplazará la tabla de empleados.

## Fuera de alcance / pendiente conocido

- Tomar la sucursal del staff de la tabla `Employee` en vez de `staffDirectory.ts`.
- Un rol de bodega (hoy los envíos los opera el dueño).
