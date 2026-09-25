# Feature Specification: Cifras reales en el inicio del panel

**Feature Branch**: `013-dashboard-visit-stats`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Pendiente del spec 011: en el inicio del panel web, '+3 vs mes anterior', 'Mejor racha: 14 días' y '3 sucursales visitadas' son texto fijo, iguales para todo socio. Desde el spec 012 cada entrada en sucursal es una visita real, así que ya hay de dónde calcularlas."

## Clarifications

### Session 2026-09-25

- Q: ¿Dónde viajan? → A: En `MembershipInfo`, junto a `visits` y `streak`, que ya se derivan ahí de las mismas filas: `visitsLastMonth`, `bestStreak`, `branchesThisMonth`. Moverlas a un objeto aparte cambiaría campos que ya usan dos clientes sin ganar nada.
- Q: ¿"Mejor racha" de cuándo? → A: Del último año — la misma ventana de días que el backend ya lee para la racha actual.
- Q: ¿Cómo se escribe la diferencia contra el mes anterior? → A: "+3 vs mes anterior", "-2 vs mes anterior", "0 vs mes anterior"; en verde solo cuando sube.
- Q: ¿Y el móvil? → A: Su panel muestra visitas, racha y días restantes, sin cifras inventadas; queda igual.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El socio ve cifras suyas (Priority: P1) 🎯 MVP

En el inicio del panel web, las cuatro tarjetas muestran datos del socio: visitas del mes y su diferencia contra el mes anterior, racha actual y su mejor racha, días restantes y su plan, y sucursales distintas visitadas este mes.

**Independent Test**: e2e — con visitas sembradas en días distintos y sucursales distintas, `GET /users/me/membership` trae `visitsLastMonth`, `bestStreak` y `branchesThisMonth` correctos. Web (mock): Diego ve "+3 vs mes anterior" y "Mejor racha: 14", calculados de sus datos, no de un texto.

**Acceptance Scenarios**:

1. **Given** 5 visitas este mes y 7 el anterior, **When** abre su panel, **Then** ve "-2 vs mes anterior", sin verde.
2. **Given** una racha de 4 días hace dos semanas y una actual de 2, **When** abre su panel, **Then** racha 2 y "Mejor racha: 4".
3. **Given** visitas este mes en Roma Sur y Condesa, **When** abre su panel, **Then** "SUCURSALES VISITADAS" = 2.

### Edge Cases

- Socio sin visitas: todo en 0, "0 vs mes anterior".
- Enero: el mes anterior es diciembre del año anterior.

## Requirements *(mandatory)*

- **FR-001**: `MembershipInfo` MUST traer `visitsLastMonth`, `bestStreak` y `branchesThisMonth`, derivados de las visitas reales en hora de CDMX.
- **FR-002**: `bestStreak` MUST ser ≥ `streak`.
- **FR-003**: El panel web MUST pintar esas cifras con textos traducidos, sin números fijos en los mensajes.

## Success Criteria *(mandatory)*

- **SC-001**: 0 cifras fijas en las tarjetas del inicio del panel.

## Assumptions

- Una visita por socio por día (spec 012), así que días con visita = visitas.
