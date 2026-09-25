# Feature Specification: El registro web pide el teléfono

**Feature Branch**: `007-web-signup-phone`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "El registro de customer-app no pide teléfono (pendiente en apps/backend/CLAUDE.md): los socios que se registran en la web nunca reciben los avisos de WhatsApp. Además pide cumpleaños y nunca lo manda."

## Clarifications

### Session 2026-09-25

- Q: ¿El teléfono es obligatorio? → A: Sí, igual que en el móvil: es el canal de todos los avisos (vencimiento, pedido listo, pago confirmado).
- Q: ¿Qué pasa con el cumpleaños? → A: Se quita del registro: nunca se enviaba ni se usa en ningún lado, y el móvil no lo pide. Capturarlo queda para cuando exista edición del perfil.
- Q: ¿Qué formatos se aceptan? → A: Los mismos que el móvil (`toE164` de customer-core): 10 dígitos (México) o con `+`/`52` al inicio; se guarda en E.164.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrarse con teléfono (Priority: P1) 🎯 MVP

Quien crea su cuenta en la web captura su teléfono (con la nota de para qué se usa), y su cuenta nace con él: le llegan los avisos de WhatsApp como a quien se registra en el móvil.

**Independent Test**: registrarse con "55 1234 5678" → Cognito recibe `phone_number = +525512345678`; con "123" → error junto al formulario y no se crea nada.

**Acceptance Scenarios**:

1. **Given** el formulario de registro, **When** el socio escribe un teléfono de 10 dígitos, **Then** la cuenta se crea con el teléfono en E.164.
2. **Given** un teléfono inválido, **When** envía el formulario, **Then** ve "Revisa tu teléfono…" y no se crea la cuenta.
3. **Given** que alguien llama a la ruta de registro sin teléfono o con uno inválido, **When** el servidor lo recibe, **Then** responde 400 sin llamar a Cognito.

### Edge Cases

- Teléfono con espacios, guiones o paréntesis: se normaliza.
- Número extranjero con `+`: se acepta si tiene 8–15 dígitos.
- Login social (Google/Facebook): no pasa por este formulario; sigue sin teléfono (fuera de alcance).

## Requirements *(mandatory)*

- **FR-001**: El registro web MUST pedir teléfono obligatorio con una nota de para qué se usa.
- **FR-002**: El teléfono MUST validarse y normalizarse a E.164 en el navegador y otra vez en el servidor.
- **FR-003**: La cuenta MUST crearse en Cognito con `phone_number`.
- **FR-004**: El registro MUST dejar de pedir el cumpleaños.
- **FR-005**: Textos es/en.

## Success Criteria *(mandatory)*

- **SC-001**: El 100% de las cuentas creadas con el formulario web tienen teléfono.

## Assumptions

- El backend ya guarda `phone_number` del token al crear al socio (hecho para el móvil, 2026-09-12).
- Probar el registro de punta a punta requiere User Pool vivo; se prueban la ruta y la validación con tests unitarios.
