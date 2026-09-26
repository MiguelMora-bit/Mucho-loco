---

description: "Trazabilidad de Inicio de sesión con Google y Facebook"
---

# Tasks: Inicio de sesión con Google y Facebook

Spec retroactivo: cada tarea es un requisito ya implementado y lo que lo verifica. Una tarea abierta es un hueco real de verificación.

- [X] FR-001 · `apps/customer-app/lib/pkce.test.ts`; `app/api/auth/social/start/route.test.ts`.
- [X] FR-002/003 · `app/api/auth/social/callback/route.test.ts`; `tests/e2e/social-login.spec.ts`.
- [X] FR-004 · `social-login.spec.ts` ("the Google button redirects straight to the Hosted UI").
- [ ] Login social de punta a punta con Google y Facebook reales (requiere crear las apps OAuth).
