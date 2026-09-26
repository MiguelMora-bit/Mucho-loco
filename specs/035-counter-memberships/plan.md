# Implementation Plan: Altas y renovaciones de membresía en mostrador

**Branch**: `035-counter-memberships` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

branch-app: `routes/counter/MembershipTab.tsx`, `membership.repository` (mock + HTTP), `lib/fingerprintScanner.ts`, `lib/membershipPlans.ts`. Backend: `counter-memberships` (`signup`, `renew`, `overdue`, `members`).

## Dónde vive

- `apps/branch-app/src/routes/counter/MembershipTab.tsx`, `src/lib/repositories/membership.*`, `src/lib/{fingerprintScanner,membershipPlans,pricing}.ts`
- `apps/backend/src/counter-memberships/`, `src/memberships/membership-plans.ts`

## Constitution Check

II ✅ precio y código en el servidor · III ✅ tipos compartidos · V ✅ e2e contra Postgres.
