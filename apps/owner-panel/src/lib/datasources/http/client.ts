import { createApiClient, ApiRequestError } from '@mucho-loco/api-client';
import { apiBaseUrl } from './config';
import { useAuthStore } from '../../stores/auth.store';
import i18n from '../../i18n';

/**
 * Cliente del backend para este app.
 *
 * El cómo genérico vive en `@mucho-loco/api-client`, compartido con
 * `branch-app`. Aquí solo la política propia: el token del dueño sale del
 * store de auth (localStorage — SPA sin servidor propio) y `?lang=` viaja en
 * toda request porque el inventario global aplana nombres de producto.
 *
 * Casi todas las rutas de este app piden rol `owner` en el backend; un token
 * de gerente recibe 403, no 401. Esa distinción la hace el servidor, no aquí.
 */
export const api = createApiClient({
  baseUrl: apiBaseUrl,
  getToken: () => useAuthStore.getState().idToken ?? undefined,
  missingTokenMessage:
    'Sin sesión de dueño — ProtectedRoute debió redirigir al login antes de llegar aquí',
  missingBaseUrlMessage: 'VITE_API_URL no está definida — requerida con VITE_DATA_SOURCE=http',
  defaultQuery: () => ({ lang: i18n.language?.startsWith('en') ? 'en' : 'es' }),
});

export { ApiRequestError };
