import { apiBaseUrl } from './config';
import { useAuthStore } from '../../stores/auth.store';
import i18n from '../../i18n';

/**
 * Cliente HTTP del backend.
 *
 * Gemelo del de `customer-app`, con dos diferencias que vienen de ser una SPA
 * y no Next.js: el token sale del store de auth (localStorage, no una cookie
 * httpOnly — esta app no tiene servidor propio), y no hay caché de framework
 * que configurar. Cuando `owner-panel` haga este mismo swap serán tres copias
 * y valdrá la pena extraerlo a un paquete compartido; con tres consumidores a
 * la vista la abstracción correcta se ve, adivinarla ahora no.
 */

/** Error del API. `body` trae el `{ code, ... }` que promete common/error-codes.ts del backend. */
export class ApiRequestError extends Error {
  // Campos declarados y asignados a mano, no parámetros del constructor: este
  // app compila con `erasableSyntaxOnly` (tsconfig de Vite), que prohíbe las
  // parameter properties porque no se pueden borrar con solo quitar los tipos.
  readonly status: number;
  readonly path: string;
  readonly body: Record<string, unknown>;

  constructor(
    status: number,
    path: string,
    message: string,
    body: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.path = path;
    this.body = body;
  }

  /** Código de negocio, cuando el backend lo mandó. */
  get code(): string | undefined {
    return typeof this.body.code === 'string' ? this.body.code : undefined;
  }
}

export interface ApiRequestOptions {
  query?: Record<string, string | number | undefined>;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/** El ID token del staff logueado. Toda ruta interna del backend lo exige. */
function bearerToken(): string {
  const token = useAuthStore.getState().idToken;
  if (!token) {
    throw new Error('Sin sesión de staff — ProtectedRoute debió redirigir al login antes de llegar aquí');
  }
  return token;
}

/**
 * Idioma actual, para los endpoints que aplanan un `LocalizedString` a un
 * string de display (nombre de producto en inventario y tickets).
 */
function currentLang(): string {
  return i18n.language?.startsWith('en') ? 'en' : 'es';
}

function buildUrl(path: string, query: ApiRequestOptions['query'], withLang: boolean): string {
  const base = apiBaseUrl();
  if (!base) {
    throw new ApiRequestError(0, path, 'VITE_API_URL no está definida — requerida con VITE_DATA_SOURCE=http');
  }
  const search = new URLSearchParams();
  if (withLang) search.set('lang', currentLang());
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return `${base}${path}${qs ? `?${qs}` : ''}`;
}

async function request(
  method: string,
  path: string,
  opts: ApiRequestOptions,
  body: unknown,
  withLang: boolean,
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${bearerToken()}`,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    return await fetch(buildUrl(path, opts.query, withLang), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (cause) {
    if (cause instanceof ApiRequestError) throw cause;
    // fetch solo tira por red/abort — un 4xx/5xx llega como Response.
    throw new ApiRequestError(
      0,
      path,
      `${method} ${path} no pudo completarse: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

async function parse<T>(res: Response, method: string, path: string): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new ApiRequestError(res.status, path, `${method} ${path} respondió ${res.status}`, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** `withLang` agrega `?lang=` — solo donde el backend aplana un LocalizedString. */
export async function apiGet<T>(
  path: string,
  opts: ApiRequestOptions = {},
  withLang = false,
): Promise<T> {
  return parse<T>(await request('GET', path, opts, undefined, withLang), 'GET', path);
}

export async function apiGetOrNull<T>(
  path: string,
  opts: ApiRequestOptions = {},
  withLang = false,
): Promise<T | null> {
  const res = await request('GET', path, opts, undefined, withLang);
  if (res.status === 404) return null;
  return parse<T>(res, 'GET', path);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  opts: ApiRequestOptions = {},
  withLang = false,
): Promise<T> {
  return parse<T>(await request('POST', path, opts, body, withLang), 'POST', path);
}
