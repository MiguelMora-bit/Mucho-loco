# Implementation Plan: Avisos por WhatsApp

**Branch**: `047-whatsapp-notices` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Estado**: implementado (retroactivo)

## Summary

Backend: `src/notifications/` (servicio con `notifyOnce`, cliente de la Cloud API, cron, webhook) llamado desde pagos, pedidos para recoger y envíos.

## Dónde vive

- `apps/backend/src/notifications/*`

## Constitution Check

II ✅ idempotencia en la base · V ✅ unit + e2e (sin Meta real).
