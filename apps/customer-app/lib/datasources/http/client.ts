import { createApiClient, ApiRequestError, type ApiClient, type FetchExtras } from '@mucho-loco/api-client';
import { apiBaseUrl } from './config';

/**
 * Clientes del backend para este app. El cómo genérico (URL, token, timeout,
 * 404→null, errores) vive en `@mucho-loco/api-client` y las rutas en los
 * datasources de `@mucho-loco/customer-core/http`; aquí solo va la política
 * propia de Next.
 */

/**
 * Cómo traduce este app el `maxAgeSeconds` que declara cada datasource: con la
 * caché del `fetch` de Next. Catálogo y landing se revalidan cada N segundos;
 * lo que no declara edad (cuenta, escrituras) nunca se cachea.
 */
export function nextCachePolicy(maxAgeSeconds: number | undefined): FetchExtras {
  return maxAgeSeconds === undefined ? { cache: 'no-store' } : { next: { revalidate: maxAgeSeconds } };
}

interface CustomerApiOptions {
  getToken?: () => Promise<string | undefined>;
  missingTokenMessage?: string;
}

export function createCustomerApi(options: CustomerApiOptions = {}): ApiClient {
  return createApiClient({
    baseUrl: apiBaseUrl,
    getToken: options.getToken,
    missingTokenMessage: options.missingTokenMessage,
    missingBaseUrlMessage: 'NEXT_PUBLIC_API_URL no está definida — requerida con NEXT_PUBLIC_DATA_SOURCE=http',
    cachePolicy: nextCachePolicy,
  });
}

/**
 * Endpoints públicos (catálogo, landing). Sin token a propósito: estos
 * repositorios también corren en el navegador (los stores de la landing),
 * donde la cookie httpOnly no existe. Y así este módulo nunca arrastra
 * `next/headers` al bundle del cliente — el de cuenta vive aparte, en
 * `account-client.ts`.
 */
export const publicApi = createCustomerApi();

export { ApiRequestError };
