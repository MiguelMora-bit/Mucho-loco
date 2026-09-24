<!--
Sync Impact Report
- Version: (plantilla sin llenar) → 1.0.0
- Principios: todos nuevos (primera ratificación)
  I. Contract-first, mock-first
  II. El backend es la fuente de verdad del dinero y la identidad
  III. Lógica de dominio compartida en packages/
  IV. Fechas ISO e idioma al pintar
  V. Pruebas contra lo real
  VI. Simplicidad para un solo desarrollador
  VII. Decisiones documentadas y honestas
- Secciones agregadas: Restricciones técnicas y de negocio; Flujo de desarrollo y compuertas
- Secciones quitadas: ninguna
- Plantillas: no se modifican (leen la constitución en tiempo de ejecución)
- TODOs diferidos: ninguno
-->

# Mucho Loco Gym Constitution

## Core Principles

### I. Contract-first, mock-first

- Toda funcionalidad nueva de un frontend (`customer-app`, `mobile-app`, `branch-app`,
  `owner-panel`) MUST definir primero su contrato como interfaz `I*Repository` y quedar
  100% funcional contra un datasource mock antes de depender del backend.
- El mock MUST seguir siendo el datasource por defecto; el HTTP se prende con el flag del app
  (`NEXT_PUBLIC_DATA_SOURCE`, `EXPO_PUBLIC_DATA_SOURCE`, `VITE_DATA_SOURCE` = `http`).
- Mock y HTTP MUST ser indistinguibles para la UI: mismas formas, mismos errores tipados, mismo
  formato de datos. Si prender el flag cambia algo en pantalla, es un bug del mock.
- Cambiar de mock a HTTP MUST tocar solo el datasource, nunca páginas ni componentes.

**Por qué**: un solo desarrollador puede cerrar flujos completos sin esperar infraestructura, y
el contrato del repositorio es la especificación que el backend tiene que cumplir.

### II. El backend es la fuente de verdad del dinero y la identidad

- La identidad MUST salir del token verificado (`@CurrentUser()`), nunca de un parámetro de
  query, body o ruta.
- Precios, totales y montos MUST calcularse en el backend; el cliente solo manda ids y
  cantidades. Los DTOs MUST rechazar campos no declarados (`whitelist` + `forbidNonWhitelisted`).
- Un pedido o membresía MUST quedar "pagado" solo por el webhook del proveedor de pago
  (Stripe) o porque mostrador cobró el efectivo. Nunca por lo que diga el frontend.
- Cada peso cobrado MUST dejar una fila en el registro único de cobros (`Charge`), y todo CFDI
  MUST salir de ahí. Hay un solo emisor fiscal (un RFC, un CSD) para las 15 sucursales.
- Los errores de negocio MUST viajar como códigos de máquina (`common/error-codes.ts`) que cada
  datasource traduce a errores tipados del contrato; los fallos que no son de negocio (500, red)
  MUST propagarse sin disfrazar.
- Las vistas previas de precio de los frontends MUST coincidir con lo que cobra el backend.

**Por qué**: el mock confiaba en quien lo llamaba; un backend con frontera de red real no puede.

### III. Lógica de dominio compartida en `packages/`

- Los tipos de dominio que usa más de un app MUST vivir en `@mucho-loco/types`.
- El cliente HTTP MUST ser `@mucho-loco/api-client`; contrato, mocks, catálogo semilla, precios,
  fechas y textos del socio MUST vivir en `@mucho-loco/customer-core` (web y móvil).
- Duplicar código entre apps solo se permite para piezas triviales sin lógica que pueda
  desincronizarse (del tamaño de `createAsyncResource.ts`, ~20 líneas). Cuando hay lógica real y
  aparecería una tercera copia, MUST extraerse a un paquete.
- La UI no se comparte: DOM + Tailwind en web, componentes nativos en móvil.

**Por qué**: un arreglo en una copia no llega a las otras; la extracción se paga cuando hay
lógica que se puede desincronizar.

### IV. Fechas ISO e idioma al pintar

- Toda fecha que cruza el contrato MUST ir en ISO. La formatea quien la pinta, con
  `lib/dates.ts` del app: fechas sin hora con `timeZone: 'UTC'`, instantes en hora local.
- Todo texto visible MUST pasar por el sistema de traducción (es/en). El contenido de catálogo
  que cambia de idioma usa `LocalizedString`.
- Los documentos históricos (recibos, pedidos, nóminas emitidas) MUST congelarse en el idioma y
  los valores del momento en que se emitieron; no se recalculan al leer.
- Única excepción vigente: `UserProfile.birthdate`, que escribe el socio.

**Por qué**: texto preformateado obliga al backend a saber español, impide cambiar de idioma y
rompió la UI la primera vez que se prendió `DATA_SOURCE=http`.

### V. Pruebas contra lo real

- Backend: la lógica pura MUST tener tests unitarios; todo endpoint nuevo MUST tener un e2e
  contra Postgres real (`mucho_loco_test`), no contra mocks de Prisma. La autenticación se
  simula sobreescribiendo `CognitoVerifierService`, no con `jest.mock()`.
- Frontends: lógica pura y datasources HTTP MUST tener tests unitarios (ruta, token, `?lang=`,
  traducción de errores); los flujos de usuario críticos MUST tener un spec de Playwright.
- Cuando se agrega un datasource HTTP, una prueba de integración MUST verificar que cada ruta
  existe en el backend real (un error de dedo en la URL pasa todos los unitarios).
- Un bug de "falla al hacer clic" MUST diagnosticarse en un navegador real, no leyendo el HTML.

**Por qué**: los mocks afirman contra lo que uno cree; los errores que costaron caro
aparecieron solo contra la base, el navegador o el servicio reales.

### VI. Simplicidad para un solo desarrollador

- El backend MUST seguir siendo un monolito modular de NestJS (un módulo por dominio); no se
  introducen microservicios, colas externas ni servicios nuevos sin una necesidad demostrada.
- Stack fijo: Next.js (customer-app), Expo (mobile-app), Vite + React (branch-app,
  owner-panel), NestJS + Prisma 6 + Postgres, Cognito, Terraform, Stripe. Cambiar una pieza
  MUST justificarse como decisión explícita documentada.
- Toda complejidad que un plan agregue MUST justificarse en su tabla de "Complexity Tracking";
  por defecto, YAGNI.

**Por qué**: no hay equipo que opere la complejidad; cada pieza nueva la mantiene la misma persona.

### VII. Decisiones documentadas y honestas

- Toda decisión de arquitectura o de negocio MUST quedar en el `CLAUDE.md` que corresponda (raíz
  o del app), con fecha ISO y el porqué, incluidas las alternativas descartadas cuando importan.
- Lo que no se ha probado contra el servicio real (Facturapi, Meta, un User Pool vivo) MUST
  marcarse explícitamente como "sin probar contra X", con lo que falta para probarlo.
- Las reglas de negocio pendientes de decidir MUST listarse como pendientes y no inventarse en
  el código.

**Por qué**: el proyecto se retoma entre sesiones; lo que no está escrito se re-decide mal.

## Restricciones técnicas y de negocio

- **Secretos**: credenciales (Stripe, Facturapi, Meta, OAuth de Google/Facebook) MUST vivir en
  archivos `.env`/`.tfvars` fuera de git, nunca en el código, los commits ni el chat.
- **Costo de infraestructura**: `terraform apply` sobre recursos que cobran MUST hacerse solo con
  confirmación explícita del dueño del proyecto, y el estado vivo o destruido de la infra MUST
  reflejarse en la "Nota operativa" del `CLAUDE.md` raíz.
- **Pagos**: todo pago en línea pasa por Stripe; el efectivo solo existe en mostrador o en
  "recoger en gym". Un método de pago no se ofrece hasta que su cobro real exista.
- **Roles**: `staff < manager < owner`, jerárquicos; un socio sin grupo recibe 403 en rutas
  internas.
- **Zona horaria**: la operación diaria de sucursal usa `America/Mexico_City`; los periodos de
  nómina y las fechas sin hora se calculan en UTC.
- **Montos provisionales** (como el precio fijo del tier `all`) MUST marcarse como provisionales
  hasta que el dueño del negocio los confirme.

## Flujo de desarrollo y compuertas

- Funcionalidades nuevas siguen Spec Kit: `/speckit-specify` → `/speckit-clarify` (cuando hay
  ambigüedad) → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.
- Cada `plan.md` MUST pasar el "Constitution Check" contra los principios I–VII antes de la
  investigación y otra vez después del diseño; toda violación va justificada en Complexity
  Tracking o se rediseña.
- Un spec MUST decir qué apps toca; si toca más de uno, se prefiere partirlo en un spec por app,
  salvo que el contrato compartido los obligue a moverse juntos.
- Compuertas antes de integrar: typecheck, lint, tests unitarios y e2e del backend en verde
  (`test.yml`). Las migraciones de Prisma MUST ir versionadas en `prisma/migrations`.
- Antes de cada commit se revisa `git status` para confirmar qué se agrega; el trabajo va en una
  rama y entra a `main` por PR.

## Governance

- Esta constitución prevalece sobre cualquier otra práctica del repo. Los `CLAUDE.md` son la guía
  operativa en tiempo de ejecución y MUST ser coherentes con ella; si chocan, se corrige uno de
  los dos en el mismo cambio.
- Enmiendas: se hacen con `/speckit-constitution`, con el porqué y el impacto en el Sync Impact
  Report, y las aprueba el dueño del proyecto (Miguel).
- Versionado semántico: MAJOR si se quita o redefine un principio; MINOR si se agrega un principio
  o sección, o se amplía materialmente; PATCH para aclaraciones y redacción.
- Cumplimiento: cada plan lo verifica en su Constitution Check, `/speckit-analyze` lo revisa antes
  de implementar y cada PR lo revisa antes de fusionar.

**Version**: 1.0.0 | **Ratified**: 2026-09-23 | **Last Amended**: 2026-09-23
