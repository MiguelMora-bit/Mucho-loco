import { createApiClient } from '@mucho-loco/api-client';
import { useSessionStore } from './stores/session.store';

/**
 * `true` solo con `EXPO_PUBLIC_DATA_SOURCE=http`. Cualquier otro valor (o su
 * ausencia) deja los mocks: el app arranca sin backend, igual que customer-app.
 *
 * `process.env.EXPO_PUBLIC_*` escrito así, literal: Expo lo reemplaza por su
 * valor al compilar. Leerlo de otra forma (`process.env[name]`) da `undefined`
 * en el teléfono.
 */
export function isHttpDataSource(): boolean {
  return process.env.EXPO_PUBLIC_DATA_SOURCE === 'http';
}

/**
 * Cliente del backend para el móvil. El cómo genérico vive en
 * `@mucho-loco/api-client`, las rutas en `@mucho-loco/customer-core/http`.
 * La política propia del teléfono:
 *
 * - **Token**: el ID token de la sesión, que vive en el llavero del SO. No hay
 *   cookie ni servidor propio en medio — la app lo manda ella misma, y lo
 *   refresca antes si está por vencer (`getFreshIdToken`).
 * - **Sin `cachePolicy`**: el `fetch` de React Native no tiene la caché de
 *   Next; el `maxAgeSeconds` de los datasources simplemente no hace nada.
 */
export const api = createApiClient({
  baseUrl: () => process.env.EXPO_PUBLIC_API_URL ?? '',
  getToken: () => useSessionStore.getState().getFreshIdToken(),
  missingTokenMessage: 'Sin sesión — la pantalla debió pedir login antes de llegar aquí',
  missingBaseUrlMessage: 'EXPO_PUBLIC_API_URL no está definida — requerida con EXPO_PUBLIC_DATA_SOURCE=http',
});
