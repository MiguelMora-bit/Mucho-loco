# Feature Specification: Nombre del plan de membresía traducido

**Feature Branch**: `011-membership-plan-label`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "MembershipInfo.plan viaja como texto armado en el servidor ('ALL GYMS · MENSUAL'): mitad inglés, mitad español, no cambia con el idioma. Viola el principio IV. Además la tarjeta 'Días restantes' del panel web dice 'Plan All Gyms · Mensual' a todo socio, tenga el plan que tenga."

## Clarifications

### Session 2026-09-25

- Q: ¿El backend manda el texto traducido o las claves? → A: Las claves. `tierKey` ya viaja; se agrega `periodKey` y se quita `plan`. Cada cliente arma el nombre con sus traducciones (principio IV: el idioma se decide al pintar). Todos los clientes viven en el monorepo y ninguno está publicado, así que quitar el campo no rompe a nadie fuera de este cambio.
- Q: ¿Qué texto? → A: "15 SUCURSALES · MENSUAL" / "15 GYMS · MONTHLY" — el alcance se nombra igual que el distintivo de los planes del landing, y el periodo como adjetivo (el landing usa "Mes" en las pestañas, que no sirve como nombre de plan).
- Q: ¿Las otras cifras falsas de la misma fila del panel ("+3 vs mes anterior", "Mejor racha: 14 días", "3 sucursales visitadas")? → A: Fuera de alcance: requieren que el backend calcule datos que hoy no calcula. Se anotan como pendiente; aquí solo se corrige la del plan, que ya tiene el dato.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El socio ve su plan en su idioma (Priority: P1) 🎯 MVP

En el panel (web y móvil) el socio ve el nombre de SU plan traducido al idioma elegido, en el encabezado, el pase de acceso, el perfil y la tarjeta de días restantes.

**Independent Test**: con el mock, `valeria` (1 sucursal, mensual) ve "1 SUCURSAL · MENSUAL" en español y "1 GYM · MONTHLY" en inglés; la tarjeta de días restantes ya no dice "All Gyms".

**Acceptance Scenarios**:

1. **Given** un socio con tier `all` y periodo `monthly`, **When** abre el panel en español, **Then** ve "15 SUCURSALES · MENSUAL".
2. **Given** el mismo socio, **When** cambia a inglés, **Then** ve "15 GYMS · MONTHLY" sin recargar datos.
3. **Given** un socio con tier `single` y periodo `quarterly`, **When** ve la tarjeta de días restantes, **Then** dice su plan, no "All Gyms · Mensual".
4. **Given** el backend real, **When** responde `GET /users/me/membership`, **Then** trae `periodKey` y no trae `plan`.

### Edge Cases

- Socio sin membresía: la tarjeta de días restantes no muestra plan.
- Una visita (`visit`): "15 SUCURSALES · VISITA" / "15 GYMS · DAY PASS".

## Requirements *(mandatory)*

- **FR-001**: `MembershipInfo` MUST traer `periodKey` y MUST NOT traer texto de plan armado.
- **FR-002**: Un helper compartido en `@mucho-loco/customer-core` MUST armar el nombre del plan desde las traducciones; web y móvil MUST usarlo.
- **FR-003**: Las traducciones MUST cubrir los 2 tiers y los 5 periodos en es y en.
- **FR-004**: La tarjeta de días restantes MUST mostrar el plan real del socio.

## Success Criteria *(mandatory)*

- **SC-001**: 0 textos de plan armados en el contrato de membresía (backend y mock).
- **SC-002**: El nombre del plan cambia de idioma junto con el resto del panel.

## Assumptions

- `PlanKey` ya existe en `@mucho-loco/types` y el backend ya guarda `periodKey` en `Membership`.
