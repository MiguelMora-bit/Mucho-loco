# Implementation Plan: Registrar entrenamientos desde la web

**Branch**: `021-web-workout-log` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
Rutas `app/api/performance/workouts/route.ts` (POST) y `[id]/route.ts` (DELETE) con tests; `components/performance/WorkoutForm.tsx` (cliente, `workoutProblem` + `workoutDay`); `WorkoutsList` con "Registrar", borrar con confirmación y `router.refresh()`. Se quita el texto `emptyWeb` ("regístralos desde la app"), que ya no es cierto.

## Constitution Check
I ✅ mismo contrato (`logWorkout`/`deleteWorkout`) · II ✅ identidad de la sesión, derivados en el servidor · III ✅ validación compartida · IV ✅ textos compartidos · V ✅ tests de ruta · VI ✅ sin rutas nuevas en el backend · VII ✅ CLAUDE.md.
