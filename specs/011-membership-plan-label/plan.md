# Implementation Plan: Nombre del plan de membresía traducido

**Branch**: `011-membership-plan-label` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
`MembershipInfo` pierde `plan: string` y gana `periodKey: PlanKey`. Las traducciones compartidas (`packages/customer-core/messages/{es,en}.json`) ganan `membershipPlan.{tiers,periods}` y `membershipPlanLabel(t, membership)` en `@mucho-loco/customer-core/membership-rules` arma "TIER · PERIODO". Backend (`toMembershipInfo`) y mock (`user.mock.ts`) mandan `periodKey`; se borran sus `TIER_LABEL`/`PERIOD_LABEL`. customer-app (`HomePane`, `ProfilePane`, `AccessPane`) y mobile-app (`Dashboard`) usan el helper; `statDaysLeftDelta` (texto fijo) se reemplaza por "Plan" + el plan real.

## Constitution Check
I ✅ contrato primero (tipo compartido + mock + HTTP) · III ✅ un helper compartido para los dos clientes · IV ✅ era la violación: el idioma se decide al pintar · V ✅ unit del helper, unit/e2e del backend, walkthrough móvil · VI ✅ se borran dos tablas de etiquetas duplicadas · VII ✅ CLAUDE.md.

## Project Structure
```text
packages/types/src/index.ts                       # MembershipInfo.periodKey, Translations.membershipPlan
packages/customer-core/messages/{es,en}.json       # membershipPlan, sin statDaysLeftDelta
packages/customer-core/src/membership-rules.ts (+ test)   # membershipPlanLabel
packages/customer-core/src/mock/user.mock.ts
apps/backend/src/memberships/memberships.service.ts (+ spec), test/*.e2e-spec.ts
apps/customer-app/components/dashboard/{HomePane,ProfilePane,AccessPane}.tsx
apps/mobile-app/src/components/account/Dashboard.tsx
```
