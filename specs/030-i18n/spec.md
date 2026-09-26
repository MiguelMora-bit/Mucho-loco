# Feature Specification: Idiomas (español e inglés) y fechas

**Feature Branch**: `030-i18n` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo del soporte de español e inglés en los cuatro frontends y de la convención de fechas en ISO.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Web: `next-intl` con rutas por idioma; español por defecto sin prefijo y `/en` para inglés (`localePrefix: as-needed`).
- Los textos del socio viven en `@mucho-loco/customer-core/messages/{es,en}.json`, tipados contra `Translations` (una clave que falte truena al compilar); el móvil los lee de ahí y agrega los suyos (`mobile-messages.ts`).
- branch-app y owner-panel: `react-i18next` con sus propios archivos; el idioma es un toggle guardado en `localStorage[ml_lang]`, sin prefijo en la URL (apps internos).
- Contenido de catálogo que cambia de idioma usa `LocalizedString`; los documentos históricos (pedidos, recibos, nóminas) se congelan en el idioma en que se emitieron.
- **Fechas en ISO** en todo el contrato (2026-09-12); las formatea quien pinta: fechas sin hora con `timeZone: UTC`, instantes en hora local. Excepción: `UserProfile.birthdate` (lo escribe el socio).
- Errores tipados, nunca mensajes crudos: la UI arma el texto traducido desde el código.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cambiar de idioma (Priority: P1)

Cualquier pantalla se puede ver en español o inglés, incluidas fechas y montos.

**Independent Test**: walkthrough del móvil ("cambiar a inglés vuelve a pintar con en.json", y persiste al recargar); `apps/customer-app/tests/e2e/invoicing.spec.ts` ("labels and money follow English").

**Acceptance Scenarios**:

1. **Given** el panel en español, **When** cambia a inglés, **Then** textos, fechas y montos cambian sin recargar datos.
2. **Given** el idioma elegido, **When** recarga la app, **Then** se conserva.
3. **Given** un pedido hecho en español, **When** lo ve en inglés, **Then** los nombres del recibo siguen en español (congelado).

### Edge Cases

- Una fecha sin hora (`2026-08-01`) nunca se imprime como el día anterior en México (se fija UTC).
- Un texto que el servidor mandara ya formateado se considera defecto de contrato (principio IV).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todo texto visible MUST pasar por el sistema de traducción (es/en).
- **FR-002**: Los mensajes compartidos MUST validarse en compilación contra `Translations`.
- **FR-003**: Toda fecha del contrato MUST viajar en ISO y formatearse al pintar con la zona correcta.
- **FR-004**: El idioma elegido MUST persistir entre visitas en cada app.

## Success Criteria *(mandatory)*

- **SC-001**: 0 textos armados por el servidor en los contratos del socio (limpiados en los specs 010, 011 y 012).

## Assumptions


## Fuera de alcance / pendiente conocido

- La descripción de un cobro en Facturar llega en español (es el concepto fiscal) y no se traduce.
