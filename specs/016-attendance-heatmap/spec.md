# Feature Specification: Heatmap de asistencia real

**Feature Branch**: `016-attendance-heatmap`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "El heatmap de Rendimiento es una cuadrícula sembrada, igual para todos los socios (y en el mock, aleatoria en cada llamada). Desde el spec 012 cada entrada en sucursal es una visita real del socio: el heatmap puede ser su asistencia de verdad."

## Clarifications

### Session 2026-09-25

- Q: ¿Qué representa cada cuadro? → A: Un día de las últimas 52 semanas, en hora de CDMX: 52 columnas (la última es la semana en curso), filas de lunes a domingo. Los días que todavía no llegan van vacíos.
- Q: ¿Qué intensidad, si solo hay una visita por día? → A: Por duración cuando se conoce (`l1` < 45 min, `l2` 45–90, `l3` > 90); sin salida registrada (lo normal hoy) → `l2`. Honesto: "vino", sin inventar intensidad.
- Q: ¿Y el resto de Rendimiento (stats, récords, entrenamientos)? → A: Siguen sembrados hasta que exista captura de entrenamientos; solo el heatmap tiene hoy un dato real del cual salir.
- Q: ¿El mock? → A: Deriva el heatmap del historial de visitas del socio con la misma regla, en vez de `Math.random()` por llamada.
- Q: Hallazgo: en la web la cuadrícula llena por filas, así que una columna no es una semana (el texto dice "Cada columna = 1 semana"). → A: Se corrige (flujo por columnas, 7 filas). En el móvil, el scroll arranca en la semana actual.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El socio ve su asistencia (Priority: P1) 🎯 MVP

En Rendimiento → Heatmap, cada cuadro marcado es un día que el socio entró a una sucursal.

**Independent Test**: e2e — un socio entra hoy; `GET /performance/heatmap` devuelve 52×7 con el cuadro de hoy en `l2` y los días futuros de esta semana vacíos; otro socio no ve esa visita. Web/móvil (mock): Diego ve sus visitas de junio en las columnas correspondientes.

**Acceptance Scenarios**:

1. **Given** una visita hoy sin salida registrada, **When** abre su heatmap, **Then** el cuadro de hoy (última columna, fila del día de la semana) es `l2`.
2. **Given** una visita de 30 minutos, **When** abre su heatmap, **Then** ese cuadro es `l1`.
3. **Given** dos socios, **When** cada uno abre su heatmap, **Then** solo ve sus propias visitas.

### Edge Cases

- Visita a las 23:30 en CDMX: cuenta en ese día, no en el siguiente (UTC).
- Visita de hace más de 52 semanas: no aparece.

## Requirements *(mandatory)*

- **FR-001**: `GET /performance/heatmap` MUST salir de las visitas del socio autenticado.
- **FR-002**: La cuadrícula MUST ser 52 semanas × 7 días (lunes→domingo), terminando en la semana actual de CDMX.
- **FR-003**: Web MUST pintar una columna por semana; el móvil MUST abrir mostrando la semana actual.
- **FR-004**: El mock MUST derivar el heatmap de su historial de visitas con la misma regla.
- **FR-005**: La tabla sembrada `heatmap_cells` MUST retirarse.

## Success Criteria *(mandatory)*

- **SC-001**: 0 cuadros inventados en el heatmap de un socio.

## Assumptions

- Una visita por socio por día (spec 012).
