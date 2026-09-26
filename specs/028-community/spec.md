# Feature Specification: Comunidad entre socios

**Feature Branch**: `028-community` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo del feed interno entre socios ("Comunidad"): publicar, dar like y comentar. Distinto del feed de marketing del landing.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Feed básico: posts, likes y comentarios; sin rankings ni conexión con Rendimiento por ahora (CLAUDE.md raíz).
- El autor (nombre y sucursal) lo resuelve el servidor desde el usuario del token y su membresía — nunca del body (antes el mock confiaba en el cliente).
- Un like es una fila (`CommunityLike`, único por post y usuario): dar y quitar like es idempotente; `likeCount`/`likedByMe` se derivan al leer.
- El feed del backend arranca vacío a propósito: sembrar posts requeriría usuarios falsos con correos que podrían chocar con cuentas reales. El mock trae ejemplos.
- Se puede publicar sin membresía: el post sale sin sucursal.
- El móvil relee el feed tras cada acción en vez de parchar el estado local: el servidor es la fuente de verdad.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publicar y conversar (Priority: P1)

El socio publica, da like y comenta en los posts de otros socios.

**Independent Test**: `apps/backend/test/app.e2e-spec.ts` ("community (real per-user CRUD, identity from token)", dos usuarios); walkthrough del móvil ("comunidad: publicar, dar like y comentar").

**Acceptance Scenarios**:

1. **Given** un socio con sesión, **When** publica un texto, **Then** el post aparece en el feed con su nombre y sucursal.
2. **Given** un post de otro socio, **When** le da like dos veces, **Then** el conteo sube y luego vuelve a bajar.
3. **Given** un comentario vacío, **When** lo manda, **Then** 400 y no se publica.
4. **Given** un post que no existe, **When** le comenta, **Then** 404.

### Edge Cases

- Dos socios distintos nunca se ven como "yo" (`likedByMe` es por quien pide el feed).
- Sin sesión: 401 (la comunidad es contenido de cuenta).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Publicar, dar/quitar like y comentar MUST requerir sesión y tomar la identidad del token.
- **FR-002**: El autor MUST derivarse del usuario y su membresía en el servidor.
- **FR-003**: Like MUST ser idempotente por (post, usuario).
- **FR-004**: El feed MUST devolver `likeCount` y `likedByMe` relativos a quien lo pide.

### Key Entities

- CommunityPost, CommunityLike (`@@unique([postId, userId])`), CommunityComment.

## Success Criteria *(mandatory)*

- **SC-001**: Nadie puede publicar a nombre de otro socio.

## Assumptions


## Fuera de alcance / pendiente conocido

- Moderación (reportar o borrar posts).
- Paginación del feed.
