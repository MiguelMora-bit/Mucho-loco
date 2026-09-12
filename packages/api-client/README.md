# @mucho-loco/api-client

Cliente HTTP compartido para hablarle a `apps/backend`.

Existe porque los tres frontends necesitaban lo mismo —armar la URL, pegar el
`Authorization`, traducir un 404 a `null`, cortar por timeout, y envolver el
error del API en algo tipado— y escribirlo tres veces significa que un arreglo
en uno no llega a los otros. La política de **cuál** token y **qué** caché la
pone cada app al crear su cliente (`createApiClient`), porque ahí sí son
distintas: Next lee una cookie httpOnly en el servidor, las dos SPA leen su
store de Zustand.

Paquete **source-only**, sin build — igual que `@mucho-loco/types`. Lo compilan
los bundlers que lo consumen (Vite, Next). No lo importa `apps/backend`.
