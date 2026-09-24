# @mucho-loco/api-client

Cliente HTTP compartido para hablarle a `apps/backend`.

Existe porque los frontends necesitaban lo mismo —armar la URL, pegar el
`Authorization`, traducir un 404 a `null`, cortar por timeout, y envolver el
error del API en algo tipado— y escribirlo varias veces significa que un
arreglo en uno no llega a los otros. Lo usan los cuatro: customer-app, branch-app,
owner-panel y mobile-app (los dos del socio a través de los datasources de
`@mucho-loco/customer-core/http`).

La política de **cuál** token y **qué** caché la pone cada app al crear su
cliente (`createApiClient`), porque ahí sí son distintas:

| App | `getToken` | `cachePolicy` |
|---|---|---|
| customer-app | cookie httpOnly, solo en el servidor (y un cliente sin token para lo público) | `maxAgeSeconds` → `next.revalidate`; sin edad → `no-store` |
| mobile-app | ID token del llavero del teléfono | ninguna |
| branch-app, owner-panel | store de Zustand | ninguna |

Un datasource compartido declara `maxAgeSeconds` ("este dato aguanta 5
minutos") sin saber en qué plataforma corre; cada app decide qué hacer con eso.

El timeout usa `AbortController` + `setTimeout`, no `AbortSignal.timeout()`:
React Native no tiene este último (su polyfill `abort-controller` es anterior).
Hay un test que corre sin él.

Métodos: `get`, `getOrNull` (404 → `null`), `post`, `put` y `getFile`.
`getFile` (2026-09-23, para el PDF/XML de un CFDI) existe aparte porque los
demás leen la respuesta como texto, y un binario leído como texto llega
corrupto: devuelve `{ data: Uint8Array, contentType, filename }` (el nombre sale
de `Content-Disposition`) y nunca pasa por `cachePolicy`. Los errores y el
timeout son los mismos que en `get`.

Paquete **source-only**, sin build — igual que `@mucho-loco/types`. Lo compilan
los bundlers que lo consumen (Vite, Next, Metro). No lo importa `apps/backend`.
