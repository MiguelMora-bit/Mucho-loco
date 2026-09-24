# Implementation Plan: Facturación del socio (CFDI) en la app móvil

**Branch**: `002-mobile-cfdi-invoicing` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

## Summary

Pantalla nativa `invoicing` en mobile-app con la misma funcionalidad que `/invoicing` de la web, sobre el contrato de customer-core del spec 001. Nuevo: `contact` compartido en customer-core, `shareInvoiceFile` (hoja de compartir) y el acceso desde Cuenta.

## Technical Context

**Language/Version**: TypeScript 6 strict · **Primary Dependencies**: Expo SDK 57, Expo Router, React Native 0.86, `expo-file-system`, `expo-sharing` (nuevas) · **Storage**: N/A (cache temporal para compartir) · **Testing**: Vitest (`src/lib`, customer-core), Playwright sobre Expo web (mock) · **Target Platform**: iOS/Android (+ web para desarrollo) · **Project Type**: app móvil del monorepo · **Performance Goals**: SC-001 · **Constraints**: mock-first, sin Xcode/Android SDK en esta máquina · **Scale/Scope**: 1 pantalla, 1 helper nativo, 1 módulo compartido movido

## Constitution Check

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. Mock-first | Mock de customer-core es el default; walkthrough en modo mock | ✅ |
| II. Backend = verdad | Sin importes ni identidad desde el app; errores por código | ✅ |
| III. Compartir en packages | Contrato ya compartido; `contact` sube a customer-core | ✅ |
| IV. Fechas/idioma | `formatDateTime`/`formatMoney` + textos `invoicing` compartidos | ✅ |
| V. Pruebas reales | Walkthrough e2e + unit de `share-file` y `contact` | ✅ |
| VI. Simplicidad | Dos paquetes Expo oficiales, nada más | ✅ |
| VII. Documentado | `apps/mobile-app/CLAUDE.md`; versión fijada de expo-sharing explicada | ✅ |

**Post-diseño**: sin violaciones.

## Project Structure

```text
packages/customer-core/src/contact.ts (+ .test.ts)      # movido de customer-app
packages/customer-core/package.json                      # export ./contact
apps/customer-app/lib/contact.ts                         # re-export
apps/customer-app/lib/contact.test.ts                    # se muda a customer-core
apps/mobile-app/
├── package.json / app.json                              # expo-file-system, expo-sharing
├── src/lib/repositories.ts                              # invoicingRepository
├── src/lib/share-file.ts / share-file.web.ts (+ test)
├── src/lib/mobile-messages.ts                           # shareError, loginToInvoice
├── src/app/_layout.tsx                                  # Stack.Screen invoicing
├── src/app/invoicing.tsx                                # pantalla
├── src/components/invoicing/{FiscalForm,ChargeRow,ConfirmCard}.tsx
├── src/components/account/Dashboard.tsx                 # botón FACTURAR
├── tests/e2e/walkthrough.spec.ts                        # pasos de facturación
└── CLAUDE.md
```

**Structure Decision**: la estructura existente de mobile-app.

## Complexity Tracking

Sin violaciones.
