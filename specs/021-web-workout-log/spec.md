# Feature Specification: Registrar entrenamientos desde la web

**Feature Branch**: `021-web-workout-log`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "El spec 017 dejó la captura de entrenamientos solo en el móvil. En la web, Rendimiento → Entrenamientos dice 'regístralos desde la app de tu teléfono': quien entrena y después abre la compu no puede registrar ni corregir nada."

## Clarifications

### Session 2026-09-25

- Q: ¿Mismo formulario que el móvil? → A: Sí: nombre, Hoy/Ayer, duración opcional, ejercicios con series (reps × kg; kg vacío = peso corporal), "+ serie" copia la anterior, quitar serie/ejercicio. Misma validación (`workoutProblem`) antes de mandar y en el servidor.
- Q: ¿Borrar? → A: Sí, con segundo clic de confirmación, igual que el móvil.
- Q: ¿Cómo se refresca? → A: Después de guardar o borrar se relee la página del servidor (`router.refresh()`): los récords y el Resumen dependen de todos los entrenamientos, no solo del nuevo.
- Q: ¿Rutas? → A: `POST /api/performance/workouts` y `DELETE /api/performance/workouts/[id]` en el servidor de Next (la cookie de sesión solo se lee ahí), que llaman al repositorio con el correo de la sesión — nunca uno del navegador.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar desde la web (Priority: P1) 🎯 MVP

**Independent Test**: tests de ruta — sin sesión 401; forma inválida 400 `INVALID_WORKOUT` sin llamar al repositorio; válida 201 con el correo de la sesión y solo los campos registrados; borrar propio 204, ajeno o inexistente 404.

**Acceptance Scenarios**:

1. **Given** un socio en Rendimiento → Entrenamientos (web), **When** registra "Push Day" con press de banca 8×60, **Then** aparece en su historial con series, volumen y récords recalculados.
2. **Given** un ejercicio sin nombre, **When** guarda, **Then** ve el error y no se envía nada.
3. **Given** un entrenamiento suyo, **When** lo borra y confirma, **Then** desaparece.

## Requirements *(mandatory)*

- **FR-001**: La web MUST permitir registrar y borrar entrenamientos con la misma validación que el móvil.
- **FR-002**: Las rutas MUST tomar la identidad de la sesión y solo los campos de `NewWorkout`.
- **FR-003**: El historial y el Resumen MUST reflejar el cambio sin recargar a mano.

## Success Criteria *(mandatory)*

- **SC-001**: Registrar un entrenamiento cuesta lo mismo en web que en móvil.

## Assumptions

- La UI web no se puede recorrer en navegador sin User Pool vivo (mismo límite que el resto del panel); la lógica compartida ya la cubre el walkthrough del móvil.
