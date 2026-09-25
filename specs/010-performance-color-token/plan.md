# Implementation Plan: Colores de rendimiento como nombre de paleta

**Branch**: `010-performance-color-token` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
`type StatColor = 'red' | 'orange' | 'yellow' | 'gold' | 'green' | 'cream'` en `@mucho-loco/types`; `statColorOf()` en el backend normaliza (acepta `var(--x)`), migración de datos `UPDATE performance_stats`, seed y mock con nombres; la web pinta `var(--${color})`, el móvil `colors[color]`; se borra `apps/mobile-app/src/lib/css-color.ts`.

## Constitution Check
III ✅ un tipo compartido · IV ✅ el contrato manda datos, el cliente decide cómo pintar · V ✅ unit del normalizador + walkthrough · VI ✅ se borra un parche · VII ✅ CLAUDE.md.

## Project Structure
```text
packages/types/src/index.ts                               # StatColor
apps/backend/src/performance/performance.service.ts (+ spec)
apps/backend/prisma/{seed.ts,migrations/*_performance_color_token}
packages/customer-core/src/mock/performance.mock.ts
apps/customer-app/components/performance/Overview.tsx
apps/mobile-app/src/app/performance.tsx, src/lib/css-color*.ts (se borran)
```
