# Feature Specification: Registro de entradas (check-in)

**Feature Branch**: `012-member-check-ins`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Nada registra una visita: la tabla `visits` nunca recibe filas y `Membership.visits`/`streak` son columnas que se quedan en 0. Con el backend real, el socio siempre ve 0 visitas, racha 0 e historial vacío, y validar su acceso en sucursal no deja rastro."

## Clarifications

### Session 2026-09-25

- Q: ¿Cuándo nace una visita? → A: Cuando mostrador valida el acceso en `/qr` y el resultado es "permitido" (QR, huella, o nombre con un solo socio). Consultar deja de ser una lectura: `GET /branches/:id/member-access` se reemplaza por `POST /branches/:id/check-ins`, que aplica la misma regla y, si deja pasar, registra la entrada. Un acceso negado (vencida, sucursal incorrecta, no encontrado, ambiguo) no registra nada.
- Q: ¿Y si escanea dos veces el mismo día? → A: Una visita por socio por día (hora de CDMX). El segundo escaneo deja pasar igual pero no suma, y mostrador ve "Ya había entrado hoy a las HH:MM" — señal de un QR compartido. Bloquearlo es una decisión de negocio que no está tomada; queda anotada.
- Q: ¿La duración? → A: No hay registro de salida, así que no se sabe: `Visit.durationMinutes` pasa a `number | null` y se pinta "—". Capturar la salida queda fuera.
- Q: ¿Visitas y racha? → A: Se derivan de las visitas reales al leer (como `daysLeft`): visitas = días con entrada en el mes en curso; racha = días consecutivos con entrada que terminan hoy o ayer (no se rompe antes de que el socio llegue hoy). Las columnas `memberships.visits`/`streak` se borran.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mostrador registra la entrada al validar (Priority: P1) 🎯 MVP

Al validar a un socio con acceso permitido, queda registrada su entrada en esa sucursal; mostrador ve la confirmación, o el aviso de que ya había entrado hoy.

**Independent Test**: en `/qr` (mock), validar a Diego → "Entrada registrada"; validarlo otra vez → "Ya había entrado hoy a las …". Contra el backend (e2e): `POST /branches/1/check-ins` crea una fila en `visits`; el segundo no.

**Acceptance Scenarios**:

1. **Given** un socio vigente, **When** mostrador lo valida, **Then** se registra una visita en esa sucursal con la hora actual.
2. **Given** que ya entró hoy, **When** lo validan otra vez, **Then** pasa, no se registra otra visita y mostrador ve la hora de la primera.
3. **Given** un socio con membresía vencida o de otra sucursal, **When** lo validan, **Then** se niega y no se registra nada.

### User Story 2 - El socio ve sus visitas reales (Priority: P1)

En su panel (web y móvil), el socio ve cuántos días vino este mes, su racha y su historial con la sucursal y la hora de cada entrada.

**Independent Test**: e2e — un socio de la app entra por mostrador; `GET /users/me/membership` responde `visits: 1, streak: 1` y `GET /users/me/visits` lista esa entrada con `durationMinutes: null`.

**Acceptance Scenarios**:

1. **Given** entradas ayer y hoy, **When** abre su panel, **Then** racha 2.
2. **Given** su última entrada fue antier, **When** abre su panel, **Then** racha 0.
3. **Given** una visita sin salida registrada, **When** ve su historial, **Then** la duración se muestra "—".

### Edge Cases

- Entradas cerca de medianoche: el día se cuenta en hora de CDMX, no UTC.
- Dos escaneos simultáneos del mismo socio: uno solo registra (índice único por socio y día).
- Socio de mostrador sin app: también acumula visitas (es un `User` sin cuenta).

## Requirements *(mandatory)*

- **FR-001**: `POST /branches/:id/check-ins` MUST evaluar la misma regla de acceso que hoy y, solo si el resultado es `valid`, registrar la visita (sucursal, hora).
- **FR-002**: MUST existir a lo más una visita por socio por día de CDMX, garantizado por la base.
- **FR-003**: La respuesta `valid` MUST incluir la hora de la entrada del día y si fue la primera.
- **FR-004**: `MembershipInfo.visits` y `.streak` MUST derivarse de las visitas reales.
- **FR-005**: `Visit.durationMinutes` MUST aceptar `null`, y web y móvil MUST pintarlo "—".
- **FR-006**: branch-app MUST mostrar "Entrada registrada" o "Ya había entrado hoy a las HH:MM" en un acceso permitido.

## Success Criteria *(mandatory)*

- **SC-001**: Cada acceso permitido en sucursal deja exactamente una visita por socio y día.
- **SC-002**: El panel del socio contra el backend deja de mostrar ceros fijos.

## Assumptions

- El reloj de la sucursal es el del servidor; el día se calcula en `America/Mexico_City`.
- Las cifras de relleno restantes del panel (mes anterior, mejor racha, sucursales visitadas) siguen fuera de alcance; ahora ya tienen de dónde salir.
