# Feature Specification: Documentación OpenAPI del backend

**Feature Branch**: `056-openapi-docs`

**Created**: 2026-09-26

**Status**: Implemented (2026-09-26)

**Input**: Hueco del spec retroactivo 048: el CLAUDE.md raíz decidió `@nestjs/swagger` para documentar la API, pero nunca se instaló. Hoy el contrato vive repartido entre DTOs, CLAUDE.md y tests; no hay un lugar donde ver y probar las ~90 rutas.

## Clarifications

### Session 2026-09-26

- Q: ¿Dónde? → A: Swagger UI en `/docs` y el documento OpenAPI en `/docs-json`, generados del código (controllers + DTOs), sin escribir el contrato a mano.
- Q: ¿En producción? → A: Apagado por default cuando `NODE_ENV=production` (el contenedor y ECS ya lo fijan); se prende con `API_DOCS=true`. Fuera de producción, prendido; `API_DOCS=false` lo apaga. Publicar el mapa completo de la API no aporta nada a un atacante que no tenga ya un token, pero tampoco hay razón para regalarlo.
- Q: ¿Autenticación en la documentación? → A: Esquema Bearer (`cognito`, ID token de Cognito) como requisito global; las rutas `@Public()` (catálogo, webhooks, salud) salen sin candado. `@Public()` deja una marca `x-public` que el generador convierte en `security: []`, así no hay dos listas que mantener.
- Q: ¿Cuánto detalle? → A: El plugin del CLI de Nest (`nest-cli.json`) infiere los cuerpos de los DTOs (con los validadores) y usa los comentarios como descripciones. Las respuestas son interfaces de `@mucho-loco/types`, que no existen en tiempo de ejecución: salen sin esquema. Agrupado por controller (`autoTagControllers`).
- Q: ¿`@scarf/scarf`? → A: Dependencia de `swagger-ui-dist` que manda telemetría al instalar: su script de build queda deshabilitado en `pnpm-workspace.yaml`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver y probar la API (Priority: P1) 🎯 MVP

**Independent Test**: e2e — `/docs-json` responde el documento sin token, trae las rutas nuevas (050–055), el esquema Bearer global y las rutas públicas sin candado; `/docs` sirve la UI.

**Acceptance Scenarios**:

1. **Given** el backend corriendo en desarrollo, **When** se abre `/docs`, **Then** se ven las rutas agrupadas por controller con sus cuerpos.
2. **Given** un ID token, **When** se pega en "Authorize", **Then** las rutas protegidas se pueden probar desde la UI.
3. **Given** `NODE_ENV=production` sin `API_DOCS=true`, **When** se pide `/docs`, **Then** 404.

## Requirements *(mandatory)*

- **FR-001**: El backend MUST servir `/docs` y `/docs-json` cuando `apiDocsEnabled()` lo diga (reglas de arriba), sin pasar por el guard de Cognito.
- **FR-002**: El documento MUST declarar el Bearer de Cognito como seguridad global y dejar sin seguridad las operaciones `@Public()`.
- **FR-003**: `apiDocsEnabled` y el marcado de públicas MUST ser funciones puras probadas.

## Success Criteria *(mandatory)*

- **SC-001**: Una ruta nueva aparece en la documentación sin tocar nada más que su controller.

## Fuera de alcance

- Esquemas de respuesta (habría que convertir los tipos compartidos en clases).
- Generar clientes a partir del documento.
