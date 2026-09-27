# Feature Specification: Plataforma de la API y contrato compartido

**Feature Branch**: `048-api-platform` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de las reglas transversales del backend y del contrato con los frontends: contract-first, guard, validación, errores con código, cliente HTTP compartido y swap mock ↔ HTTP.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Contract-first (2026-08-30): cada `I*Repository` del frontend es el contrato; el mock es el default y el HTTP se prende con `*_DATA_SOURCE=http`, sin tocar pantallas.
- NestJS monolito modular sobre Postgres con Prisma 6 clásico (Prisma 7 se revirtió por su cliente ESM y el motor WASM con Jest, 2026-09-11).
- `CognitoAuthGuard` global (todo pide token salvo `@Public()`) y `RolesGuard` jerárquico detrás.
- `ValidationPipe` global con `whitelist` + `forbidNonWhitelisted`: un campo que el DTO no declara (p. ej. un `total`) es 400.
- Errores de negocio con código de máquina en el cuerpo del 4xx (`common/error-codes.ts`); los frontends los traducen a errores tipados y dejan pasar 500/red tal cual.
- `@mucho-loco/api-client` compartido por los 4 frontends (timeouts, 404 → null, traducción de errores); cada app le inyecta su política (token, caché, `?lang=`).
- CORS para web, las dos SPA de Vite (5173, 5174) y Expo web (8081).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cambiar de mock a backend sin tocar pantallas (Priority: P1)

Una variable de entorno cambia el origen de datos de cada app.

**Independent Test**: tests de contrato mock vs HTTP (`apps/customer-app/tests/integration/*.contract.test.ts`) e integración de rutas de los 3 apps (401, no 404); los 4 frontends recorridos en HTTP con tokens reales (2026-09-26).

**Acceptance Scenarios**:

1. **Given** `*_DATA_SOURCE=http`, **When** se abre cualquier pantalla, **Then** los datos vienen del backend con el mismo contrato.
2. **Given** un error de dedo en una URL, **When** corre la integración, **Then** se cae como 404.

### User Story 2 - El backend se defiende del cliente (Priority: P1)

Identidad del token, campos del DTO y errores con código.

**Independent Test**: `apps/backend/test/app.e2e-spec.ts` (usuario A no lee a B; campo extra rechazado).

**Acceptance Scenarios**:

1. **Given** un body con un campo no declarado, **When** llega, **Then** 400.
2. **Given** un correo ajeno en el body, **When** se pide "mis datos", **Then** responde los del token, no los del correo.

### Edge Cases

- Respuesta 200 sin cuerpo: el cliente devuelve `undefined`/`null`, no truena.
- Timeout del backend: error de red, no de negocio.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todo dominio MUST tener contrato con mock y HTTP que compilen contra la misma interfaz.
- **FR-002**: Toda ruta MUST requerir token salvo las `@Public()`.
- **FR-003**: El backend MUST rechazar campos no declarados.
- **FR-004**: Los rechazos de negocio MUST llevar código de máquina.
- **FR-005**: Los 4 frontends MUST usar `@mucho-loco/api-client`.

## Success Criteria *(mandatory)*

- **SC-001**: Prender el backend no cambia ninguna pantalla (verificado por contrato y en navegador).

## Assumptions


## Fuera de alcance / pendiente conocido

- ~~Documentación OpenAPI con `@nestjs/swagger`~~ ✅ spec 056 (2026-09-26).
- Hacer `http` el default cuando el backend esté desplegado.
