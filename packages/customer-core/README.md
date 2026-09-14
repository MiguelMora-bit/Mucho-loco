# @mucho-loco/customer-core

Lo que comparten los dos clientes del socio — `apps/customer-app` (Next.js) y
`apps/mobile-app` (Expo) — y que no es UI:

| Subpath | Qué es |
|---|---|
| `./contract` | Interfaces `I*Repository`: el contrato que cumplen mocks y backend. |
| `./mock` | Datasources mock (mock-first, ver "Metodología" en el CLAUDE.md raíz). |
| `./http` | Datasources contra `apps/backend`. Reciben un `ApiClient` de `@mucho-loco/api-client`: el token y la caché los pone cada app al crear su cliente, el datasource solo declara ruta, `auth` y `maxAgeSeconds`. |
| `./data` | Catálogo semilla de los mocks (`BRANCHES`, `PRODUCTS`, …) y `PRODUCT_CATS`. |
| `./pricing`, `./dates`, `./order-status` | Lógica pura de dominio y formato. |
| `./cognito-errors` | Excepción de Cognito → código corto (`WRONG_CREDENTIALS`, …) que la UI traduce con `t.account.errors.*`. |
| `./messages/{es,en}.json` | Textos traducidos crudos (los carga next-intl en customer-app). |
| `./translations` | Los mismos textos como `Record<Lang, Translations>`: tipados, y verificados en compilación contra `Translations`. |

Existe porque, con un segundo cliente, todo esto iba a tener dos copias: un
cambio de contrato o de precio en una no llegaba a la otra. Mismo criterio que
`@mucho-loco/api-client`.

Solo subpaths, sin índice raíz: importar `./pricing` desde un componente no
debe arrastrar los mocks y el catálogo al bundle del navegador.

Paquete **source-only**, sin build — igual que `@mucho-loco/types`. Lo compilan
los bundlers que lo consumen (Next vía `transpilePackages`, Metro). Sin
dependencias de React, Next ni React Native: si algo necesita una, se queda en
su app.
