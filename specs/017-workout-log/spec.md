# Feature Specification: Registrar entrenamientos

**Feature Branch**: `017-workout-log`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Rendimiento → Entrenamientos es una lista sembrada, igual para todos, con texto armado (`vol: '14,200 kg'`, `duration: '58m'`). No existe forma de registrar un entrenamiento, así que nada de Rendimiento (salvo el heatmap, spec 016) es del socio."

## Clarifications

### Session 2026-09-25

- Q: ¿Qué se registra? → A: Nombre libre ("Push Day"), el día (Hoy o Ayer — se registra en el gimnasio o al llegar a casa), duración opcional en minutos y los ejercicios, cada uno con sus series (repeticiones × kg; 0 kg = peso corporal).
- Q: ¿Qué calcula el servidor? → A: Número de series, volumen (Σ reps × kg) y récords: un entrenamiento marca récord en un ejercicio cuando su peso más alto supera el mejor de todos los entrenamientos anteriores de ese ejercicio. La primera vez que se registra un ejercicio es la línea base, no récord (si no, cada ejercicio nuevo sería un "récord").
- Q: ¿Dónde se captura? → A: En el móvil, que es lo que el socio trae en el gimnasio. La web lista los entrenamientos (y dice que se registran desde la app). Captura en la web queda fuera.
- Q: ¿Se puede corregir? → A: Borrar un entrenamiento propio (con confirmación). Editar queda fuera: borrar y volver a registrar.
- Q: ¿El contrato? → A: Sin texto armado (principio IV): `name` (lo escribe el socio, no se traduce), `date` (día ISO), `durationMinutes`, `exercises`, y los derivados `setCount`, `volumeKg`, `prs`. El resumen y los récords de la pestaña Resumen siguen sembrados hasta el spec 018.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar un entrenamiento (Priority: P1) 🎯 MVP

Desde Rendimiento → Entrenamientos en el móvil, el socio registra lo que hizo y lo ve en su historial con series, volumen y duración.

**Independent Test**: walkthrough (mock): "Push Day" hoy, 45 min, press de banca 2 series (8×60, 6×70) → aparece arriba con "2 series · 900 kg" y "45m".

**Acceptance Scenarios**:

1. **Given** un ejercicio con series 8×60 y 6×70, **When** guarda, **Then** el entrenamiento aparece con 2 series y 900 kg.
2. **Given** un ejercicio sin nombre o una serie sin repeticiones, **When** guarda, **Then** ve el error y no se envía nada.
3. **Given** otro socio, **When** abre su historial, **Then** no ve ese entrenamiento.

### User Story 2 - Récords (Priority: P2)

**Acceptance Scenarios**:

1. **Given** press de banca a 70 kg el lunes, **When** registra 75 kg el miércoles, **Then** el del miércoles muestra "🏆 Press de banca · 75 kg".
2. **Given** la primera vez que registra sentadilla, **When** guarda, **Then** no marca récord.

### User Story 3 - Borrar un error (Priority: P3)

**Acceptance Scenarios**:

1. **Given** un entrenamiento propio, **When** lo borra y confirma, **Then** desaparece y los récords se recalculan.
2. **Given** el id de un entrenamiento de otro socio, **When** intenta borrarlo, **Then** 404.

### Edge Cases

- Fecha en el futuro (hora de CDMX): 400.
- Límites: 1–20 ejercicios, 1–20 series por ejercicio, 1–100 repeticiones, 0–500 kg, duración 1–600 min.
- Nombre de ejercicio con otra capitalización o espacios ("press de banca " vs "Press de banca"): es el mismo ejercicio para los récords.

## Requirements *(mandatory)*

- **FR-001**: `POST /performance/workouts` MUST guardar el entrenamiento del socio del token y devolverlo con sus derivados; `GET` lista los suyos (más reciente primero); `DELETE /performance/workouts/:id` borra uno suyo.
- **FR-002**: Series, volumen y récords MUST calcularlos el servidor (y el mock con la misma regla).
- **FR-003**: La validación de forma MUST ser la misma en el cliente (customer-core) y en el DTO.
- **FR-004**: El móvil MUST permitir registrar y borrar; la web MUST listar.
- **FR-005**: La tabla sembrada `workouts` MUST reemplazarse por entrenamientos por socio.

## Success Criteria *(mandatory)*

- **SC-001**: Un socio registra un entrenamiento de 3 ejercicios en menos de 2 minutos desde el móvil.
- **SC-002**: 0 textos armados en el contrato de entrenamientos.

## Assumptions

- Los nombres de ejercicio son texto libre; un catálogo de ejercicios queda para después.
