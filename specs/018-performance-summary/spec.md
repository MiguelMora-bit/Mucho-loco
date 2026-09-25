# Feature Specification: Resumen y récords de Rendimiento, del socio

**Feature Branch**: `018-performance-summary`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Tras el spec 017, la pestaña Resumen de Rendimiento sigue sembrada: '18 entrenamientos', '94K', '7d', '3 PRs' y tres récords escritos a mano, iguales para todos, con el texto armado en el servidor. Ya hay de dónde calcularla: entrenamientos registrados (017) y asistencia (012)."

## Clarifications

### Session 2026-09-25

- Q: ¿Qué cifras? → A: Las mismas cuatro tarjetas, calculadas: entrenamientos del mes (vs el anterior), volumen del mes en kg (vs el anterior, en %), racha actual de asistencia (con la mejor) y récords del mes (con los ejercicios).
- Q: ¿Racha de entrenamientos o de asistencia? → A: De asistencia: es la misma que muestra el panel (spec 012/013) y no depende de que el socio registre cada día; dos rachas distintas en dos pantallas confundirían.
- Q: ¿Qué récords se muestran? → A: Los últimos tres que marcó la regla del spec 017, con el peso anterior ("+10 kg").
- Q: ¿El contrato? → A: Números, no texto (principio IV): `PerformanceSummary` reemplaza a `PerformanceStat` (`num: '94K'`, `sub: '+3 vs mes anterior'`), y `PersonalRecord` pasa a `{ exercise, weightKg, date, previousKg }`. Las tarjetas (texto y color de paleta, spec 010) las arma un helper de customer-core que usan web y móvil.
- Q: ¿Y las tablas sembradas? → A: `performance_stats` y `personal_records` se borran; el normalizador de colores del spec 010 queda sin uso y también se va.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El resumen es del socio (Priority: P1) 🎯 MVP

**Independent Test**: e2e — un socio registra dos entrenamientos este mes (el segundo con récord) → `GET /performance/summary` trae `workoutsThisMonth: 2`, su volumen y `prsThisMonth: 1`; `GET /performance/records` trae ese récord con `previousKg`. Móvil (mock): las tarjetas y récords de Diego salen de sus entrenamientos.

**Acceptance Scenarios**:

1. **Given** 2 entrenamientos este mes y 1 el anterior, **When** abre Resumen, **Then** "2" con "+1 vs mes anterior".
2. **Given** volumen de 4,000 kg este mes y 5,000 el anterior, **When** abre Resumen, **Then** "-20% vs mes anterior".
3. **Given** un récord de press de banca de 105 kg (antes 95), **When** abre Resumen, **Then** lo ve con "+10 kg".
4. **Given** un socio sin entrenamientos, **When** abre Resumen, **Then** ceros y sin récords, sin errores.

### Edge Cases

- Mes anterior en cero: el volumen no muestra porcentaje (no se divide entre cero).
- Enero: el mes anterior es diciembre.

## Requirements *(mandatory)*

- **FR-001**: `GET /performance/summary` MUST derivar las cifras de los entrenamientos del socio y de su asistencia.
- **FR-002**: `GET /performance/records` MUST devolver los últimos 3 récords con su peso anterior.
- **FR-003**: Web y móvil MUST armar las tarjetas con el mismo helper, traducidas.
- **FR-004**: Las tablas sembradas de stats y récords MUST retirarse.

## Success Criteria *(mandatory)*

- **SC-001**: 0 cifras sembradas en Rendimiento.
