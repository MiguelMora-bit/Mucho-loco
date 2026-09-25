# Implementation Plan: Registrar entrenamientos

**Branch**: `017-workout-log` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
Contrato (`@mucho-loco/types`): `WorkoutSet`, `WorkoutExercise`, `NewWorkout`, y `Workout` rediseñado (`id`, `date`, `name`, `durationMinutes`, `exercises`, `setCount`, `volumeKg`, `prs`). customer-core: `workouts.ts` con `validateWorkout` y `withProgress` (derivados + récords) — la regla la comparten mock y clientes; el backend tiene su gemela (`workout-progress.ts`). `IPerformanceRepository.getWorkouts(email)`, `logWorkout(email, input)`, `deleteWorkout(email, id)` en mock (por socio, Diego sembrado) y HTTP. Backend: modelos `Workout` (por socio) + `WorkoutSet`, migración que reemplaza la tabla sembrada, DTO anidado, `WorkoutsService`, rutas en `performance/workouts`. Móvil: pantalla `workout/new` (Stack) y botón borrar con confirmación en la lista. Web: `WorkoutsList` con el contrato nuevo y estado vacío.

## Constitution Check
I ✅ contrato + mock + HTTP · II ✅ identidad del token; derivados en el servidor · III ✅ validación y regla compartidas · IV ✅ sin texto armado; `formatDuration`, kg con `Intl` al pintar · V ✅ unit de la regla (dos gemelas), e2e, walkthrough · VI ✅ texto libre, sin catálogo; sin editar · VII ✅ CLAUDE.md.
