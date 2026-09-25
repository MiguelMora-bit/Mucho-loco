---

description: "Task list for Registrar entrenamientos"
---

# Tasks: Registrar entrenamientos

## Contrato y regla
- [X] T001 Tipos nuevos en `packages/types` (`Workout` rediseñado, `NewWorkout`, `WorkoutExercise`, `WorkoutSet`); textos `performance.workouts.*` es/en.
- [X] T002 Test (fallando) + `packages/customer-core/src/workouts.ts`: `validateWorkout`, `withProgress` (series, volumen, récords con línea base, nombres normalizados).

## Backend
- [X] T003 Unit (fallando) + `apps/backend/src/performance/workout-progress.ts` (gemela).
- [X] T004 e2e (fallando): registrar → listar con derivados; récord al superar; otro socio no ve; borrar propio 204 / ajeno 404; futuro 400; forma inválida 400.
- [X] T005 Esquema (`Workout` por socio + `WorkoutSet`), migración, seed sin workouts, `CreateWorkoutDto`, `WorkoutsService`, rutas. Hace pasar T004.

## Clientes
- [X] T006 customer-core: contrato, mock por socio (Diego sembrado), HTTP; tests.
- [X] T007 Web: `WorkoutsList` con el contrato nuevo; página pasa el email.
- [X] T008 Móvil: lista con borrar (confirmación), pantalla `workout/new`; walkthrough.
- [X] T009 Docs y validación.
