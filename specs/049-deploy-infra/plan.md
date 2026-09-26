# Implementation Plan: Infraestructura y despliegue

**Branch**: `049-deploy-infra` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

`infra/modules/*` + `infra/envs/dev`; `apps/backend/Dockerfile`; `.github/workflows/{test,deploy}.yml`.

## Dónde vive

- `infra/modules/{network,database,ecr,ecs,cognito,cicd}/`, `infra/envs/dev/`
- `apps/backend/Dockerfile`
- `.github/workflows/{test,deploy}.yml`

## Constitution Check

VII ✅ decisiones documentadas y honestas; costo y destrucción siempre explícitos.
