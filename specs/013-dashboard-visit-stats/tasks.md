---

description: "Task list for Cifras reales en el inicio del panel"
---

# Tasks: Cifras reales en el inicio del panel

- [X] T001 [US1] `MembershipInfo.{visitsLastMonth,bestStreak,branchesThisMonth}` en `packages/types`; mensajes `statVisitsDeltaSuffix`/`statBestStreakLabel` (sin números) en `Translations` y `messages/{es,en}.json`.
- [X] T002 [US1] Unit (fallando) + `visit-stats.ts`: `visitsLastMonth` (enero → diciembre), `longestStreak`, `branchesThisMonth`.
- [X] T003 [US1] `MembershipsService.getForUser` los deriva (lee `branchId`); unit.
- [X] T004 [US1] e2e en `test/branch-ops.e2e-spec.ts`: visitas sembradas en días y sucursales distintas → los tres campos.
- [X] T005 [US1] Mock `user.mock.ts` con valores curados; fixtures.
- [X] T006 [US1] `HomePane`: "+N/-N/0 vs mes anterior" (verde si sube), "Mejor racha: N", sucursales del mes.
- [X] T007 Docs y validación: tsc, tests, e2e backend, build web, walkthrough móvil.
