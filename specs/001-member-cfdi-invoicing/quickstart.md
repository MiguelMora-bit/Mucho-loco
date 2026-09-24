# Quickstart: validar la facturación del socio

Cómo comprobar de punta a punta que la funcionalidad cumple el spec. Formas y errores: ver
[data-model.md](./data-model.md) y [contracts/](./contracts/).

## 1. Pruebas automáticas

```bash
pnpm --filter @mucho-loco/api-client test          # put + getFile
pnpm --filter @mucho-loco/customer-core test       # fiscal, errores, mock, datasource HTTP
pnpm --filter customer-app test                    # invoicing.repository
pnpm --filter @mucho-loco/backend test:e2e -- invoicing   # invoice.uuid en /users/me/charges
pnpm --filter customer-app test:e2e -- invoicing   # Playwright contra el mock (requiere User Pool vivo)
pnpm turbo run typecheck lint
```

Esperado: todo en verde.

**Requisito para toda validación de UI (Playwright y sección 2): un User Pool de Cognito vivo.**
customer-app no tiene login mock — `/api/auth/login` habla con Cognito y `getCurrentUserEmail`
verifica el JWT contra su JWKS, aunque los DATOS sean mock. Hoy la infra está destruida (CLAUDE.md
raíz); levantar solo Cognito (`cd infra/envs/dev && terraform apply -target=module.cognito`,
prácticamente gratis, pero requiere confirmación explícita del dueño del proyecto), actualizar
`.env.local` (paso 3 de "Para retomar") y crear el usuario de prueba. Sin eso, solo corren las
pruebas unitarias y de backend.

El estado del mock vive en memoria del dev server: si los cobros "Facturable" se agotan entre
corridas, reiniciar `pnpm dev`.

## 2. A mano con el mock (default, sin backend)

```bash
pnpm --filter customer-app dev
```

Iniciar sesión (Cognito real, datos mock) y abrir `/invoicing` — también desde el acceso del dashboard.

| # | Paso | Esperado | Cubre |
|---|---|---|---|
| 1 | Abrir `/invoicing` sin sesión (ventana privada) | Redirige a `/account` y vuelve después del login | FR-017 |
| 2 | Abrir con sesión | Invitación a capturar datos fiscales, sin error; 5 cobros en 4 estados | US2-1, FR-006/007 |
| 3 | "Facturar" en un cobro Facturable sin datos fiscales | Pide los datos; al guardar vuelve a la confirmación de ese cobro | US2-5, FR-011 |
| 4 | Capturar RFC `abcd`, CP `123` | Errores junto a cada campo; nada se guarda | US2-3 |
| 5 | Elegir régimen 605 con uso G01 ya elegido | Uso se limpia; solo aparece S01 | US2-4, FR-002 |
| 6 | Guardar `  xaxx010101000 `, nombre en minúsculas, régimen 616, S01 | Se guarda en mayúsculas sin espacios | US2-2 |
| 7 | Confirmar la factura | Motivo del SAT tal cual; cobro sigue Facturable; acceso a editar datos | US4-1 |
| 8 | Cambiar a un RFC válido (p. ej. `CUPU800825569`, régimen 612, G03) y facturar de nuevo | Resumen con datos → "Facturado" sin recargar; aviso con el correo de destino | US1-1, US4-2, FR-010/012 |
| 9 | Doble clic rápido en "Facturar" de otro cobro | Una sola factura | SC-004, FR-013 |
| 10 | En el cobro facturado: PDF y XML | Se descargan los archivos | US3-1 |
| 11 | "¿Datos incorrectos?" | Abre `wa.me` con cobro, fecha y folio en el mensaje | US3-3, FR-020 |
| 12 | Cobros "Ya no facturable" y "No facturable" | Sin botones; explicación de cada estado | US1-3, US3-2 |
| 13 | Cambiar a inglés | Etiquetas, fechas y montos cambian; datos fiscales y motivo del SAT no | FR-016 |

El estado vacío (US1-4) lo cubre el unit del mock con `NO_CHARGES_TEST_EMAIL` (T027): iniciar
sesión con ese correo exigiría crearlo en Cognito.

## 3. Contra el backend local (principio V)

Prerequisitos: Postgres local (`mucho_loco_dev`), backend en `:3001`. Sin cuenta de Facturapi,
el backend responde `INVOICING_UNAVAILABLE` al facturar — es lo esperado, y sirve para validar
ese mensaje.

```bash
# apps/customer-app/.env.local
NEXT_PUBLIC_DATA_SOURCE=http
NEXT_PUBLIC_API_URL=http://localhost:3001
pnpm --filter @mucho-loco/backend start:dev
pnpm --filter customer-app dev
pnpm --filter customer-app test:integration        # cada ruta nueva existe y pide token
```

Sin User Pool vivo, las rutas de cuenta solo se pueden validar hasta el 401 (igual que el resto
de dominios de cuenta, ver `apps/customer-app/CLAUDE.md`). La respuesta autenticada campo por
campo la cubre el e2e del backend.

Para comprobar SC-005: con los mismos datos, las pantallas del paso 2 se ven igual en mock y en
HTTP.

## 4. Lo que NO se valida aquí

Timbrado real, correo de Facturapi, factura global y el portal de autofactura: requieren la
cuenta de Facturapi (pendiente en el CLAUDE.md raíz).
