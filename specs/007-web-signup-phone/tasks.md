---

description: "Task list for El registro web pide el teléfono"
---

# Tasks: El registro web pide el teléfono

- [X] T001 [US1] Tests (fallando) en `apps/customer-app/app/api/auth/register/route.test.ts`: sin teléfono o inválido → 400 `INVALID_PHONE` sin llamar a Cognito; con "55 1234 5678" → `UserAttributes` incluye `{ Name: 'phone_number', Value: '+525512345678' }`.
- [X] T002 [US1] `route.ts`: validar con `toE164` y mandar `phone_number`. Hace pasar T001.
- [X] T003 [US1] Textos: `account.signup.phoneLabel`/`phoneNote` y `account.errors.invalidPhone` en `packages/types` y `messages/{es,en}.json`; quitar `birthdayLabel`.
- [X] T004 [US1] `SignupForm.tsx`: campo `phone` (`type="tel"`, `autoComplete="tel"`, requerido) con la nota, en lugar del cumpleaños; `AccountClient.tsx`: valida con `toE164` antes de enviar (error `invalidPhone`), manda `phone`, mapea `INVALID_PHONE`.
- [X] T005 Docs (`apps/backend/CLAUDE.md` pendiente resuelto, `apps/customer-app/CLAUDE.md`) y validación (tsc, lint, test, build).
