# Feature Specification: Auditoría de cortes de caja desde HQ

**Feature Branch**: `052-owner-cash-audit`

**Created**: 2026-09-26

**Status**: Implemented (2026-09-26)

**Input**: Hueco del spec retroactivo 034 y regla de negocio del CLAUDE.md raíz: "corte de caja por turno/día, auditable desde el panel del dueño". Hoy HQ ve ingresos agregados, no los cortes; y cerrar un turno no registra cuánto efectivo había de verdad en el cajón ni quién lo cerró, así que no hay nada que auditar más allá de volver a sumar.

## Clarifications

### Session 2026-09-26

- Q: ¿Qué se audita? → A: El arqueo. Al cerrar, el gerente captura el efectivo que contó en el cajón (obligatorio); el sistema lo compara con el efectivo que el corte dice que entró. La diferencia (contado − esperado; negativo = faltante) es lo que HQ revisa.
- Q: ¿Se guarda o se deriva? → A: Se congela al cerrar, como un recibo de nómina: efectivo contado, totales por forma de pago, número de movimientos y quién cerró (nombre y correo del token, nunca del body). El corte cerrado es un documento, no algo que se recalcule.
- Q: ¿Arqueo ciego? → A: No. La pantalla de caja ya muestra los totales por forma de pago; esconderlos al cerrar no aporta. Se muestra la diferencia antes de confirmar para que el gerente recuente si no cuadra.
- Q: ¿Cómo lo ve HQ? → A: Pantalla "Cortes de caja" en owner-panel: mes (hora de CDMX) y sucursal opcional; por corte: sucursal, apertura y cierre, quién cerró, efectivo esperado, contado, diferencia, tarjeta, transferencia y movimientos; detalle con las transacciones. Arriba: número de cortes, faltante y sobrante del mes, y cortes sin arqueo.
- Q: ¿Cortes cerrados antes de esto? → A: Se listan sin arqueo ("—"): no hay forma honesta de saber cuánto se contó.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El gerente cierra con arqueo (Priority: P1) 🎯 MVP

**Independent Test**: e2e — cerrar sin `countedCash` → 400; con él → el turno cerrado trae contado, esperado y quién cerró. branch-app (mock): el cierre pide el efectivo contado y muestra la diferencia.

**Acceptance Scenarios**:

1. **Given** un turno con $1,090 en efectivo, **When** el gerente cierra capturando $1,000, **Then** queda cerrado con esperado $1,090, contado $1,000 (faltante de $90) y su nombre como quien cerró.
2. **Given** el formulario de cierre, **When** el monto está vacío o no es un número entero ≥ 0, **Then** no deja confirmar.
3. **Given** un turno cerrado en el historial de la sucursal, **When** el gerente lo abre, **Then** ve contado y diferencia.

### User Story 2 - HQ audita los cortes (Priority: P1)

**Independent Test**: e2e — `GET /cash-register/audit?month=` (dueño) lista el corte con su diferencia; gerente → 403; mes inválido → 400. owner-panel (mock): tabla, filtros, resumen y detalle.

**Acceptance Scenarios**:

1. **Given** cortes de varias sucursales en el mes, **When** el dueño abre "Cortes de caja", **Then** los ve del cierre más reciente al más viejo, con faltantes en rojo y sobrantes en naranja.
2. **Given** el filtro de sucursal, **When** elige una, **Then** solo ve sus cortes.
3. **Given** un corte, **When** abre el detalle, **Then** ve las transacciones del turno.

### Edge Cases

- Dos gerentes cierran el mismo turno a la vez: uno gana, el otro recibe `SHIFT_ALREADY_CLOSED` (la actualización es condicional a `status = open`).
- Un corte sin movimientos: esperado $0; contar $0 cuadra.
- Mes con cierre el día 31 a las 23:00 de CDMX: cuenta en ese mes.

## Requirements *(mandatory)*

- **FR-001**: Cerrar un turno MUST requerir `countedCash` (entero, 0 a 10,000,000) y MUST congelar contado, totales por forma de pago, movimientos y quién cerró.
- **FR-002**: Quién cerró MUST salir del token verificado.
- **FR-003**: `GET /cash-register/audit?month=YYYY-MM[&branchId=]` MUST ser solo del dueño, filtrar por mes de CDMX y devolver la diferencia calculada.
- **FR-004**: Los totales y la diferencia MUST calcularse con funciones puras probadas.
- **FR-005**: owner-panel MUST tener "Cortes de caja" (mock y HTTP) con resumen, filtros y detalle; branch-app MUST pedir el efectivo contado al cerrar (mock y HTTP).

### Key Entities

- CashRegisterShift gana `countedCash`, `cashTotal`, `cardTotal`, `transferTotal`, `transactionCount`, `closedByName`, `closedByEmail` (nulos en turnos abiertos y en cortes previos).
- CashShiftAudit: la vista de HQ de un corte cerrado.

## Success Criteria *(mandatory)*

- **SC-001**: Todo corte cerrado desde hoy dice cuánto se contó, cuánto debía haber y quién lo cerró, y HQ lo ve sin entrar a la sucursal.

## Assumptions

- Una caja por sucursal (spec 034).
- Qué hacer con un faltante (descontarlo, investigarlo) es decisión del dueño, fuera del sistema.

## Fuera de alcance

- Fondo de caja inicial (el cajón arranca en $0 para el cálculo).
- Que un gerente solo pueda cerrar turnos de SU sucursal: el backend todavía no liga al gerente con su sucursal (vive en `staffDirectory.ts` de branch-app). Mismo caso para las transacciones de un turno.
