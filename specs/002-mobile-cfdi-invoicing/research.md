# Research: Facturación del socio (CFDI) en la app móvil

## R1. Contrato: se reusa tal cual

- **Decision**: `IInvoicingRepository`, `InvoicingMockDatasource`, `InvoicingHttpDatasource`, `invoicingErrorOf`, `fiscal` (catálogo, filtro, validación), `formatMoney`/`formatDateTime` y los textos `invoicing` — todo de `@mucho-loco/customer-core` (spec 001). mobile-app solo agrega `invoicingRepository` en `src/lib/repositories.ts`.
- **Rationale**: principio III; la razón por la que customer-core existe.
- **Alternatives**: ninguna razonable.

## R2. Número de WhatsApp de soporte

- **Decision**: mover `WHATSAPP` + `whatsappUrl` de `apps/customer-app/lib/contact.ts` a `@mucho-loco/customer-core/contact` (con su test); `customer-app/lib/contact.ts` queda como re-export de una línea (mismo patrón que `lib/data.ts` y compañía).
- **Rationale**: principio III — la segunda app que lo necesita.
- **Alternatives**: copiar la constante (dos números que se desincronizan).

## R3. PDF/XML en el teléfono

- **Decision**: `src/lib/share-file.ts` (nativo): escribe los bytes en `Paths.cache` con `expo-file-system` (`new File(Paths.cache, name)`, `create({ overwrite: true })`, `write(bytes)`) y abre `Sharing.shareAsync(uri, { mimeType, UTI })` (`com.adobe.pdf` / `public.xml`). `share-file.web.ts`: `Blob` + `<a download>`. Metro elige por plataforma, como `secure-storage.web.ts`.
- **Rationale**: en iOS/Android lo normal es la hoja de compartir (guardar en Archivos, mandar por WhatsApp o correo). `openBrowserAsync` no sirve: la descarga necesita el token y el navegador no lo lleva.
- **Dependencias**: `expo-file-system ~57.0.7` y `expo-sharing 57.0.21` (vía `npx expo install`). `expo-sharing` quedó FIJADO en 57.0.21: `expo install` eligió 57.0.22, publicada el mismo día, y agregó una excepción a `minimumReleaseAgeExclude` del workspace; se quitó la excepción y se fijó la anterior para no saltarse el candado de antigüedad. Subir a `~57.0.x` cuando la versión nueva cumpla la antigüedad.
- **Alternatives**: `openBrowserAsync` a una URL firmada (no existe en el backend); guardar directo en la galería (no aplica a PDF/XML).

## R4. Selector de régimen y uso de CFDI

- **Decision**: lista de opciones tocables (componente `Chip` existente, uno por renglón para el régimen porque los nombres son largos; en fila para los 3 usos). El uso muestra solo `allowedCfdiUses(régimen)`.
- **Rationale**: no hay `<select>` nativo; `Chip` ya es el patrón del app (membresía). Sin dependencias nuevas de picker.

## R5. Estado de la pantalla

- **Decision**: `useResource` carga perfil fiscal + cobros; estado local para formulario abierto, cobro pendiente (FR-006), confirmación y avisos — misma máquina de estados que `InvoicingClient` de la web. Cada escritura llama al repositorio directo (no hay Route Handlers en el móvil) y, tras un rechazo por cambio de estado, recarga la lista (`reload`).
- **Rationale**: el móvil habla directo con el repositorio (el token vive en el llavero).

## R6. Sesión expirada

- **Decision**: sin cambios: `getFreshIdToken` cierra la sesión si el refresh falla y la pantalla, sin `email`, muestra "inicia sesión" con botón a `/login`. Un 401 que llegue igual se muestra como error de conexión con reintentar.

## R7. Pruebas

- **Decision**: la lógica está probada en customer-core (spec 001). Aquí: test del nuevo `contact` en customer-core; test de `share-file` nativo con `expo-file-system`/`expo-sharing` simulados (nombre, bytes, mimeType/UTI) — Vitest ya prueba `src/lib` sin RN; pasos nuevos en `tests/e2e/walkthrough.spec.ts` (modo mock): capturar datos con errores de forma y filtro 605, rechazo del SAT → corregir → facturar, descarga (web) y enlace de WhatsApp.
