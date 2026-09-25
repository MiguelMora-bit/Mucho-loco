# Feature Specification: Colores de rendimiento como nombre de paleta, no CSS

**Feature Branch**: `010-performance-color-token`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Hallazgo de contrato en apps/mobile-app/CLAUDE.md: PerformanceStat.color viaja como 'var(--orange)', que solo tiene sentido en un navegador. El móvil lo traduce con css-color.ts; lo correcto es que el contrato mande un nombre de la paleta."

## Clarifications

### Session 2026-09-25

- Q: ¿Nombre de paleta o hex? → A: Nombre de la paleta de marca (`red`, `orange`, `yellow`, `gold`, `green`, `cream`): cada cliente lo pinta con su propio tema (variables CSS en la web, `theme.ts` en el móvil) y un cambio de tono no requiere tocar datos.
- Q: ¿Y los datos ya guardados? → A: Migración de datos que convierte `var(--x)` a `x` y los hex `#6dd56d`/`#ffe066` a `green`/`gold`; el backend además acepta un valor viejo y lo normaliza al leer.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El mismo dato se pinta igual en web y móvil (Priority: P1) 🎯 MVP

El resumen de rendimiento muestra cada cifra con su color de marca en la web y en el móvil, sin que el contrato hable CSS.

**Independent Test**: la pantalla de rendimiento en web (mock) y móvil (walkthrough) muestra las cifras con el color de la paleta; el contrato trae `'orange'`, no `'var(--orange)'`.

**Acceptance Scenarios**:

1. **Given** una estadística con color `orange`, **When** se pinta en la web, **Then** usa `var(--orange)`.
2. **Given** la misma, **When** se pinta en el móvil, **Then** usa `colors.orange` del tema.
3. **Given** un valor viejo `var(--red)` en la base, **When** el backend lo lee, **Then** responde `red`.

### Edge Cases

- Un nombre desconocido: la web y el móvil caen al color crema.

## Requirements *(mandatory)*

- **FR-001**: `PerformanceStat.color` MUST ser un nombre de la paleta (`StatColor`), no CSS.
- **FR-002**: El backend MUST normalizar valores viejos `var(--x)` al leer, y una migración MUST convertir los ya guardados.
- **FR-003**: Web y móvil MUST resolver el nombre con su propio tema; desconocido → crema.
- **FR-004**: El parche `css-color.ts` del móvil MUST retirarse.

## Success Criteria *(mandatory)*

- **SC-001**: 0 valores CSS en el contrato de rendimiento.

## Assumptions

- La paleta de marca es la misma en ambos clientes (`theme.ts` = `ml.*` de Tailwind).
