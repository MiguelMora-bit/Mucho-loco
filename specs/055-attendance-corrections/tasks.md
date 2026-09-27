---

description: "Task list for Corregir una salida olvidada"
---

# Tasks: Corregir una salida olvidada

- [X] T001 Regla pura `clockOutProblem` (después de la entrada, no futura, ≤ 24 h) + test, en backend (`attendance/clock-out-rule.ts`) y gemela en branch-app (`lib/clockOutRule.ts`).
- [X] T002 Backend: migración `20260927023917_attendance_corrections` (`correctedBy`, `correctedAt`); `getForgottenEntries` (abiertos desde antes de hoy) y `closeEntry` (cierre condicional, quién corrigió del token); `CloseEntryDto`; `ENTRY_NOT_FOUND`/`ENTRY_ALREADY_CLOSED`/`INVALID_CLOCK_OUT`; rutas de gerente. Unit 15.
- [X] T003 e2e (`branch-ops`, "attendance corrections"): el olvidado aparece, mostrador 403, el empleado no puede entrar hasta cerrarlo, horas inválidas → 400, cerrar marca `correctedBy` y destraba la entrada, uno abierto hoy no sale como olvidado, segundo cierre / inexistente. 93/93.
- [X] T004 branch-app: contrato + errores tipados (mock + HTTP), seed con un turno olvidado de ayer, "hoy" del mock en hora local (antes UTC), store `forgottenShifts`, "Turnos sin salida" con `datetime-local` (`min`/`max`) y confirmación al guardar, marca "salida corregida por" en la tabla del día. Textos es/en.
- [X] T005 Validación: branch-app tsc, 170 unit, build, 25 integración contra el backend local; recorrido en navegador (harness temporal, mock). El recorrido cambió el diseño: la lista mostraba a la gerente al fichar su propia entrada → ahora solo días anteriores; y la confirmación nació porque la marca de la tabla solo cubre turnos de hoy.
- [X] T006 Docs: CLAUDE.md de backend y branch-app, spec 038, índice.
