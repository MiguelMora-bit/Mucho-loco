# Feature Specification: Alertas de QR compartido

**Feature Branch**: `020-shared-qr-alerts`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Pendiente del spec 012: un segundo escaneo del mismo QR el mismo día deja pasar y solo avisa 'ya había entrado hoy'. No distingue a quien salió y volvió de un QR prestado, y nadie en HQ se entera."

## Clarifications

### Session 2026-09-25

- Q: ¿Bloquear el segundo acceso? → A: No. Misma sucursal el mismo día es normal (salió y volvió) y sigue como hoy. En OTRA sucursal el mismo día es la señal de un QR prestado, pero un socio de 15 sucursales puede ir a dos en un día: mostrador decide con un aviso fuerte ("pide una identificación") y queda registrada una alerta para HQ. Bloquear automáticamente dejaría afuera a socios legítimos sin que nadie lo revise.
- Q: ¿Qué ve mostrador? → A: En rojo: "Hoy ya entró en CONDESA a las 07:05. Pide una identificación: puede ser un QR prestado." (El aviso naranja de siempre si fue en la misma sucursal.)
- Q: ¿Qué ve HQ? → A: En el resumen del panel del dueño, "Alertas de acceso (30 días)": cuándo, socio, dónde entró primero y a qué hora, dónde intentó después. Para ver patrones (el mismo QR alternando sucursales).
- Q: ¿Una alerta por intento? → A: Sí, cada intento en otra sucursal queda — tres intentos en un día son tres alertas, y eso también es señal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mostrador ve que el QR ya entró en otra sucursal (Priority: P1) 🎯 MVP

**Independent Test**: e2e — socio `all` entra en Roma Sur y luego en Condesa → la segunda respuesta trae `checkIn.firstBranch: 'ROMA SUR'` y queda una alerta; un segundo escaneo en Roma Sur no la crea. branch-app (mock): segundo escaneo del mismo QR en otra sucursal → aviso rojo.

**Acceptance Scenarios**:

1. **Given** una entrada hoy en Roma Sur, **When** el mismo QR entra en Condesa, **Then** pasa, mostrador ve el aviso rojo con sucursal y hora, y se registra una alerta.
2. **Given** una entrada hoy en Roma Sur, **When** vuelve a escanear en Roma Sur, **Then** el aviso de siempre y ninguna alerta.

### User Story 2 - HQ revisa las alertas (Priority: P2)

**Acceptance Scenarios**:

1. **Given** alertas en los últimos 30 días, **When** el dueño abre su resumen, **Then** las ve, la más reciente primero.
2. **Given** un gerente de sucursal, **When** pide las alertas, **Then** 403.

### Edge Cases

- Acceso negado en la segunda sucursal (p. ej. tier `single`): no hay entrada ni alerta — la regla de acceso ya lo detuvo.

## Requirements *(mandatory)*

- **FR-001**: `CheckIn` MUST traer `firstBranch` (sucursal de la primera entrada del día).
- **FR-002**: Un acceso permitido en otra sucursal el mismo día MUST registrar una alerta; en la misma sucursal, no.
- **FR-003**: `GET /access-alerts` (dueño) MUST listar las de los últimos 30 días, la más reciente primero.
- **FR-004**: branch-app MUST mostrar el aviso rojo; owner-panel MUST mostrar la lista (mock y HTTP).

## Success Criteria *(mandatory)*

- **SC-001**: Todo uso del mismo QR en dos sucursales el mismo día queda a la vista de mostrador y de HQ.
