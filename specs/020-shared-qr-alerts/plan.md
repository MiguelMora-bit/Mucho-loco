# Implementation Plan: Alertas de QR compartido

**Branch**: `020-shared-qr-alerts` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary
Tipos: `CheckIn.firstBranch`, `AccessAlert`. Backend: modelo `AccessAlert` (socio, sucursal del intento, sucursal y hora de la primera entrada), migración; `recordEntry` lee la visita del día con su sucursal y, si el intento es en otra, crea la alerta; `GET /access-alerts` (owner, 30 días). branch-app: aviso rojo cuando `firstBranch` ≠ sucursal actual (mock con la misma regla). owner-panel: `statsRepository.getAccessAlerts()` (mock + HTTP) y sección en el resumen.

## Constitution Check
I ✅ contrato + mock + HTTP · II ✅ la alerta la registra el servidor · III ✅ tipos compartidos · IV ✅ ISO, hora al pintar, textos traducidos · V ✅ e2e, tests de los dos apps · VI ✅ sin bloquear ni reglas nuevas de acceso · VII ✅ CLAUDE.md.
