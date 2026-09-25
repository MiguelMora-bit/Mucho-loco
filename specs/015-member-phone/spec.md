# Feature Specification: Teléfono del socio — completarlo y cambiarlo

**Feature Branch**: `015-member-phone`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Los avisos de WhatsApp (pedido listo, en camino, membresía por vencer) necesitan el teléfono del socio. Quien entra con Google o Facebook no lo da nunca, y nadie puede cambiar el suyo: el perfil es de solo lectura."

## Clarifications

### Session 2026-09-25

- Q: ¿Qué se puede editar? → A: Solo el teléfono, que es lo que habilita los avisos. Nombre y correo vienen del login (Cognito / Google / Facebook); editarlos obliga a sincronizar Cognito y queda fuera.
- Q: ¿Se actualiza también en Cognito? → A: No. Quien manda los avisos es el backend y lee su propia columna; el claim `phone_number` solo llena un teléfono vacío (nunca pisa uno existente), así que lo que el socio escriba en su perfil gana. Cambiarlo en Cognito pediría verificar por SMS, que no está configurado.
- Q: ¿Se verifica con un código? → A: No por ahora: se valida la forma (10 dígitos o E.164), el mismo nivel que el registro. Queda anotado.
- Q: ¿Cómo se entera quien no lo tiene? → A: Un aviso en el inicio del panel, web y móvil: "Agrega tu teléfono para recibir avisos por WhatsApp", con el campo ahí mismo. En el perfil, "Cambiar" junto al teléfono.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Completar el teléfono que falta (Priority: P1) 🎯 MVP

Un socio sin teléfono ve el aviso en su panel, lo escribe y lo guarda; el aviso desaparece y desde ese momento puede recibir WhatsApp.

**Independent Test**: móvil (walkthrough, mock): una cuenta sin teléfono ve el aviso, "55 12" se rechaza, "55 1234 5678" se guarda y el aviso desaparece. Backend (e2e): `PUT /users/me/phone` guarda `+525512345678` y `GET /users/me` lo devuelve.

**Acceptance Scenarios**:

1. **Given** un socio sin teléfono, **When** abre su panel, **Then** ve el aviso con el campo.
2. **Given** que escribe "55 1234 5678", **When** guarda, **Then** se guarda como `+525512345678` y el aviso desaparece.
3. **Given** que escribe "55 12", **When** guarda, **Then** ve "Escribe un teléfono de 10 dígitos." y no se envía nada.

### User Story 2 - Cambiar el teléfono (Priority: P2)

En su perfil, el socio con teléfono puede cambiarlo.

**Acceptance Scenarios**:

1. **Given** un socio con teléfono, **When** pulsa "Cambiar" y guarda otro, **Then** su perfil muestra el nuevo.
2. **Given** un token con otro `phone_number`, **When** el socio vuelve a entrar, **Then** se conserva el que guardó.

### Edge Cases

- Body con otros campos (nombre, correo): 400 (`forbidNonWhitelisted`); solo se cambia el teléfono.
- El socio de mostrador (sin app) no pasa por aquí: su teléfono lo captura sucursal.

## Requirements *(mandatory)*

- **FR-001**: `PUT /users/me/phone { phone }` MUST guardar el teléfono en E.164 del socio autenticado y devolver su perfil; forma inválida → 400.
- **FR-002**: `IUserRepository.updatePhone` MUST existir en mock y HTTP.
- **FR-003**: Web y móvil MUST mostrar el aviso cuando falta el teléfono y permitir cambiarlo, validando con `toE164` antes de enviar.
- **FR-004**: El token nunca MUST pisar un teléfono guardado.

## Success Criteria *(mandatory)*

- **SC-001**: Un socio de login social puede quedar con teléfono en menos de un minuto desde su panel.

## Assumptions

- Los avisos ya leen `User.phone` (spec 008 y anteriores); no cambian.
