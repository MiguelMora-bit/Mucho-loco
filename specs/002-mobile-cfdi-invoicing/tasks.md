---

description: "Task list for Facturación del socio (CFDI) en la app móvil"
---

# Tasks: Facturación del socio (CFDI) en la app móvil

**Input**: `specs/002-mobile-cfdi-invoicing/` · **Tests**: sí (principio V). Contrato y reglas ya probados en customer-core (spec 001).

## Phase 1: Setup

- [X] T001 Agregar `expo-file-system ~57.0.7` y `expo-sharing 57.0.21` (fijada, ver research R3) a `apps/mobile-app/package.json` con `npx expo install`, sin excepciones nuevas en `minimumReleaseAgeExclude` de `pnpm-workspace.yaml`; config plugin `expo-sharing` en `apps/mobile-app/app.json`.
- [X] T002 [P] Mover `WHATSAPP`/`whatsappUrl` de `apps/customer-app/lib/contact.ts` a `packages/customer-core/src/contact.ts` (con su test movido a `packages/customer-core/src/contact.test.ts`), export `./contact` en `packages/customer-core/package.json`, y dejar `apps/customer-app/lib/contact.ts` como re-export de una línea.

## Phase 2: Foundational

- [X] T003 [P] Test (fallando) de `shareInvoiceFile` en `apps/mobile-app/src/lib/share-file.test.ts` con `expo-file-system` y `expo-sharing` simulados: escribe los bytes en un archivo de `Paths.cache` con el nombre del `InvoiceFile` (sobrescribe si existe) y llama `shareAsync(uri, { mimeType, UTI })` con `com.adobe.pdf` para PDF y `public.xml` para XML; si `isAvailableAsync()` es false, tira.
- [X] T004 Implementar `apps/mobile-app/src/lib/share-file.ts` y `share-file.web.ts` (Blob + `<a download>`). Hace pasar T003. (depende de T001, T003)
- [X] T005 [P] Agregar `invoicingRepository` (mock/HTTP) en `apps/mobile-app/src/lib/repositories.ts`.
- [X] T006 [P] Textos solo-móvil en `apps/mobile-app/src/lib/mobile-messages.ts` (es/en): `invoicing.loginPrompt`, `invoicing.shareError`.
- [X] T007 Registrar la pantalla `invoicing` en `apps/mobile-app/src/app/_layout.tsx` (título `t.invoicing.title`, igual que `membership`) y el botón `t.dashboard.nav.invoicing` en `apps/mobile-app/src/components/account/Dashboard.tsx` junto a Comunidad/Rendimiento.

## Phase 3: User Story 1 - Datos fiscales (P1)

**Independent Test**: guardar, salir y volver; errores de forma; 605 → solo S01.

- [X] T008 [P] [US1] Pasos de walkthrough (fallando) en `apps/mobile-app/tests/e2e/walkthrough.spec.ts` tras "rendimiento": abrir FACTURAR desde Cuenta, ver la invitación, RFC `abcd` → "Esto no tiene forma de RFC.", régimen 605 → solo "S01" disponible, guardar datos y verlos en el resumen.
- [X] T009 [US1] `apps/mobile-app/src/components/invoicing/FiscalForm.tsx`: `Field` para RFC/nombre/CP/correo, `Chip` por régimen (renglón) y por uso (solo `allowedCfdiUses`), limpia el uso al cambiar a un régimen que no lo admite, `validateFiscalProfile` antes de guardar con errores por campo (`t.invoicing.fiscal.errors`), `invoicingRepository.saveFiscalProfile`, botón deshabilitado mientras guarda, `onSaved`.
- [X] T010 [US1] `apps/mobile-app/src/app/invoicing.tsx`: `useResource` (perfil + cobros), sin sesión → `m.invoicing.loginPrompt` + botón a `/login`; sin perfil → invitación + `FiscalForm`; con perfil → resumen + EDITAR. Hace pasar T008. (depende de T005, T007, T009)

## Phase 4: User Story 2 - Facturar (P1) 🎯 MVP

**Independent Test**: facturar un cobro Facturable → Facturado sin salir, aviso del correo; un doble toque = una factura.

- [X] T011 [P] [US2] Walkthrough (fallando): lista con "Facturable"/"Facturado"/"Ya no facturable"/"No facturable"; FACTURAR en un Facturable → tarjeta de confirmación con el RFC → EMITIR FACTURA → el cobro dice "Facturado" y aparece "ya está tu factura".
- [X] T012 [P] [US2] `apps/mobile-app/src/components/invoicing/ChargeRow.tsx`: fecha (`formatDateTime`), descripción tal cual, total (`formatMoney`), etiqueta + explicación del estado, FACTURAR solo en `available`; vacío con `t.invoicing.charges.empty`.
- [X] T013 [P] [US2] `apps/mobile-app/src/components/invoicing/ConfirmCard.tsx`: resumen de cobro y datos fiscales, advertencia, EMITIR FACTURA con guardia de doble toque (ref) y deshabilitado mientras envía; `invoicingRepository.invoiceCharge`; éxito/rechazo por callback con `invoicingErrorOf`.
- [X] T014 [US2] Integrar en `invoicing.tsx`: sin perfil FACTURAR abre el formulario recordando el cobro y al guardar abre su confirmación (FR-006); éxito → recarga la lista y aviso con `fiscal.email ?? session.email`; rechazo por cambio de estado → mensaje + `reload()`; otros → mensaje; sin código → `t.invoicing.errors.connection`. Hace pasar T011. (depende de T010, T012, T013)

## Phase 5: User Story 3 - Archivos y corrección (P2)

- [X] T015 [P] [US3] Walkthrough (fallando): en el cobro Facturado, PDF dispara una descarga `.pdf` (web) y "¿Datos incorrectos?" apunta a `https://wa.me/…` con el folio.
- [X] T016 [US3] En `ChargeRow.tsx`, para `invoiced` con `cfdiId`: botones PDF/XML → `invoicingRepository.downloadInvoice` + `shareInvoiceFile` (error → `m.invoicing.shareError`), y "¿Datos incorrectos?" → `Linking.openURL(whatsappUrl(...))` de `@mucho-loco/customer-core/contact`. Hace pasar T015. (depende de T002, T004, T012)

## Phase 6: User Story 4 - Rechazo del SAT (P2)

- [X] T017 [P] [US4] Walkthrough (fallando): datos `XAXX010101000`/616/S01 → facturar → "El SAT rechazó tus datos fiscales" + motivo; CORREGIR MIS DATOS → `CUPU800825569`/612/G03 → reintentar ese cobro → Facturado.
- [X] T018 [US4] En `invoicing.tsx`: `FISCAL_DATA_REJECTED` muestra `detail` tal cual y CORREGIR MIS DATOS (abre el formulario, al guardar vuelve a confirmar ese cobro). Hace pasar T017. (depende de T014)

## Phase 7: Polish

- [X] T019 [P] Documentar en `apps/mobile-app/CLAUDE.md` ("Facturar (CFDI)") y actualizar "Pendiente" de `apps/backend/CLAUDE.md` (mobile-app hecho).
- [X] T020 Validación: customer-core, customer-app y mobile-app test/typecheck/lint + `pnpm --filter @mucho-loco/mobile-app test:e2e` en verde; anotar lo que solo se prueba en teléfono real.

## Dependencies

Setup → Foundational → US1 → US2 → (US3, US4). US3 usa `ChargeRow` de US2; US4 usa el flujo de T014.

## Parallel Opportunities

T001/T002; T003/T005/T006; en US2 T011/T012/T013.

## Implementation Strategy

MVP = US1 + US2. Después US3, US4 y polish.
