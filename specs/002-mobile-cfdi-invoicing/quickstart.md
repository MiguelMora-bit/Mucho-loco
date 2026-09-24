# Quickstart: validar facturación en mobile-app

## Automático

```bash
pnpm --filter @mucho-loco/customer-core test      # contact + todo lo de facturación
pnpm --filter @mucho-loco/mobile-app test         # share-file
pnpm --filter @mucho-loco/mobile-app typecheck
pnpm --filter @mucho-loco/mobile-app lint
pnpm --filter @mucho-loco/mobile-app test:e2e     # walkthrough en Expo web, modo mock (sin Cognito)
pnpm --filter customer-app test                   # el re-export de contact no rompe la web
```

## A mano (Expo web o Expo Go, modo mock)

1. Entrar con `diego@mucholoco.mx` → Cuenta → FACTURAR.
2. Invitación a capturar datos; RFC `abcd` → error; régimen 605 → solo S01.
3. Guardar `XAXX010101000` / 616 / S01 → facturar → motivo del SAT → CORREGIR → `CUPU800825569` / 612 / G03 → reintentar → Facturado.
4. En el cobro facturado: PDF/XML (web: descarga; teléfono: hoja de compartir) y "¿Datos incorrectos?" → WhatsApp con folio.
5. Cambiar a inglés en Cuenta → la pantalla cambia.

**Solo en teléfono real**: la hoja de compartir nativa (no hay simulador en esta máquina).
