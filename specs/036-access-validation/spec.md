# Feature Specification: Validar el acceso en la puerta

**Feature Branch**: `036-access-validation` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de `/qr` en branch-app: validar el acceso de un socio por QR, huella o nombre, con la misma regla de negocio.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Regla única (`evaluateAccess`): no encontrado → negado; vencida → negado en cualquier sucursal (se evalúa primero); tier `single` fuera de su sucursal → "sucursal incorrecta"; gracia → permitido con aviso (2026-09-10/11).
- Tres métodos con una interfaz (`AccessMethod`, patrón Strategy): QR (exacto), huella (exacta) y nombre (subcadena; 2+ coincidencias → "ambiguo" con candidatos, y elegir uno vuelve a validar por su QR).
- Con backend, la regla la evalúa el SERVIDOR; validar registra la entrada (spec 012) y avisa si el QR ya entró hoy en otra sucursal (spec 020).
- Cámara real (`qr-scanner`, se activa con un botón) y campo de lector físico (teclea + Enter) como respaldo.
- El estado es el efectivo al momento: una membresía que venció hace una hora ya no abre aunque el cron no haya pasado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Validar por QR (Priority: P1)

Mostrador escanea el QR del socio y ve si pasa.

**Independent Test**: `apps/branch-app/src/lib/access/{evaluateAccess,methods/qrAccessMethod}.test.ts`; `branch-ops.e2e-spec.ts`; navegador (2026-09-12 y 2026-09-26).

**Acceptance Scenarios**:

1. **Given** un socio `all` vigente, **When** se valida en cualquier sucursal, **Then** ACCESO PERMITIDO.
2. **Given** un socio `single` de Condesa, **When** se valida en Roma Sur, **Then** SUCURSAL INCORRECTA.
3. **Given** una membresía vencida, **When** se valida, **Then** ACCESO DENEGADO.
4. **Given** en gracia, **When** se valida, **Then** permitido con aviso.

### User Story 2 - Validar sin app: huella o nombre (Priority: P2)

Si el socio no trae el QR, por huella; si el lector falla, buscándolo por nombre.

**Independent Test**: `methods/{fingerprintAccessMethod,nameAccessMethod}.test.ts`; `branch-ops.e2e-spec.ts` ("reports ambiguity when a name search matches more than one member").

**Acceptance Scenarios**:

1. **Given** una huella registrada, **When** se valida, **Then** la misma regla que por QR.
2. **Given** "Carlos" con dos socios, **When** se busca, **Then** MÁS DE UN SOCIO COINCIDE con los candidatos.
3. **Given** un candidato elegido, **When** se confirma, **Then** se valida por su QR interno.

### Edge Cases

- Dos métodos a la vez en la misma validación: 400.
- Un código inexistente: NO ENCONTRADO.
- Espacios o salto de línea del lector físico: se recortan.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Los tres métodos MUST compartir la misma regla de acceso.
- **FR-002**: Vencida MUST negar antes que cualquier otra condición; gracia MUST permitir con aviso.
- **FR-003**: Con backend, la evaluación MUST ocurrir en el servidor.
- **FR-004**: La búsqueda por nombre MUST devolver "ambiguo" con candidatos si hay más de uno.
- **FR-005**: El resultado MUST mostrarse en un solo panel común, sin importar el método.

### Key Entities

- MemberAccessRecord, AccessCheckResult / CheckInResult.

## Success Criteria *(mandatory)*

- **SC-001**: Una membresía vencida nunca abre la puerta en ninguna sucursal.

## Assumptions


## Fuera de alcance / pendiente conocido

- Lector de huella real.
