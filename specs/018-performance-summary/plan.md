# Implementation Plan: Resumen y récords de Rendimiento, del socio

**Branch**: `018-performance-summary` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
Tipos: `PerformanceSummary`, `PersonalRecord` rediseñado, `WorkoutRecord.previousKg`; se retira `PerformanceStat`. Regla (gemela en backend y customer-core): `summarize(workouts, now)` y `latestRecords(workouts, 3)` sobre la salida de `withProgress`. Backend: `GET /performance/summary` (entrenamientos + racha de `visit-stats`), `GET /performance/records`; migración que borra `performance_stats`/`personal_records`; seed y `statColorOf` fuera. customer-core: `performanceCards(t, lang, summary)` con color de paleta; contrato `getSummary(email)`/`getPersonalRecords(email)`; mock (racha curada de la membresía mock). Web `Overview` y móvil con las tarjetas del helper.

## Constitution Check
I ✅ contrato + mock + HTTP · II ✅ derivado en el servidor · III ✅ tarjetas y regla compartidas · IV ✅ números en el contrato, texto al pintar · V ✅ unit de las gemelas y del helper, e2e, walkthrough · VI ✅ se borran dos tablas y un normalizador · VII ✅ CLAUDE.md.
