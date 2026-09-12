import { createApiClient, ApiRequestError } from '@mucho-loco/api-client';
import { apiBaseUrl } from './config';
import { useAuthStore } from '../../stores/auth.store';
import i18n from '../../i18n';

/**
 * Cliente del backend para este app.
 *
 * El cómo genérico vive en `@mucho-loco/api-client` (URL, token, timeout,
 * 404→null, errores). Aquí solo va la política propia de una SPA de staff:
 *
 * - **El token sale del store de auth** (localStorage). No hay cookie httpOnly
 *   posible: este app no tiene servidor propio.
 * - **`?lang=` en TODA request.** El backend aplana `LocalizedString` a texto
 *   en inventario y tickets, y los endpoints que no lo usan lo ignoran — es
 *   más simple que recordar en cuáles sí.
 */
export const api = createApiClient({
  baseUrl: apiBaseUrl,
  getToken: () => useAuthStore.getState().idToken ?? undefined,
  missingTokenMessage:
    'Sin sesión de staff — ProtectedRoute debió redirigir al login antes de llegar aquí',
  missingBaseUrlMessage: 'VITE_API_URL no está definida — requerida con VITE_DATA_SOURCE=http',
  defaultQuery: () => ({ lang: i18n.language?.startsWith('en') ? 'en' : 'es' }),
});

export { ApiRequestError };
