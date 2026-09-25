# Feature Specification: Afluencia por sucursal en el panel del dueño

**Feature Branch**: `014-branch-traffic`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Desde el spec 012 cada entrada permitida en sucursal es una visita registrada. El dueño ve ingresos y clientes activos por sucursal, pero no cuánta gente entra: qué sucursal está llena hoy y cuál se está vaciando."

## Clarifications

### Session 2026-09-25

- Q: ¿Qué cifras? → A: Dos por sucursal: entradas de hoy (día de CDMX) y entradas del periodo — la misma ventana que ya usan los ingresos (`?days=`, 30 por defecto), para que las columnas se lean juntas. Más el total de entradas de hoy de la cadena junto a los otros dos totales.
- Q: ¿Entradas o socios distintos? → A: Entradas (visitas). Con una visita por socio por día, "entradas de hoy" ya son socios distintos; en el periodo cuenta la frecuencia, que es lo que llena una sucursal.
- Q: ¿Dónde? → A: En `stats/branches`, que ya alimenta el resumen: `BranchStatsSummary.checkInsToday` y `.checkIns`. Sin endpoint nuevo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El dueño ve cuánta gente entra a cada sucursal (Priority: P1) 🎯 MVP

En el resumen de la cadena, la tabla por sucursal suma "Entradas hoy" y "Entradas" del periodo, y arriba aparece el total de entradas de hoy.

**Independent Test**: e2e — un check-in en Santa Fe sube en 1 `checkInsToday` y `checkIns` de esa sucursal y de ninguna otra. owner-panel (mock): la tabla muestra las dos columnas y el total.

**Acceptance Scenarios**:

1. **Given** un socio que entra hoy en Santa Fe, **When** el dueño abre el resumen, **Then** Santa Fe suma 1 en "Entradas hoy" y en "Entradas".
2. **Given** un acceso negado, **When** el dueño abre el resumen, **Then** no cuenta.
3. **Given** una visita de hace 40 días, **When** la ventana es de 30, **Then** no cuenta en "Entradas".

### Edge Cases

- Sucursal sin entradas: 0, no desaparece de la tabla (las 15 siempre).

## Requirements *(mandatory)*

- **FR-001**: `BranchStatsSummary` MUST traer `checkInsToday` y `checkIns`, derivados de las visitas registradas.
- **FR-002**: "Hoy" MUST ser el día de CDMX; el periodo, la misma ventana que los ingresos.
- **FR-003**: owner-panel MUST mostrar ambas columnas y el total de hoy, con textos traducidos.

## Success Criteria *(mandatory)*

- **SC-001**: Cada entrada registrada aparece en la afluencia de su sucursal.

## Assumptions

- Una visita por socio por día (spec 012).
