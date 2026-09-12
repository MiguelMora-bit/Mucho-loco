import { apiBaseUrl } from './config';

/** Un status no-2xx del backend. `status` 0 significa que la request nunca salió (red caída, DNS, timeout). */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export interface ApiRequestOptions {
  /** ID token de Cognito (`ml_session`). Solo lo mandan los endpoints de `/users/me/*`. */
  token?: string;
  /** Query string. Las claves con `undefined` se omiten. */
  query?: Record<string, string | number | undefined>;
  /**
   * Segundos de caché para el `fetch` de Next.js. `false` = `no-store`.
   * Fuera de Next (tests, browser) la opción se ignora sin romper nada.
   */
  revalidate?: number | false;
  /** Aborta la request. Default 10s — sin esto, un backend colgado cuelga el render del Server Component. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

function buildUrl(path: string, query: ApiRequestOptions['query']): string {
  const base = apiBaseUrl();
  if (!base) {
    throw new ApiRequestError(
      0,
      path,
      'NEXT_PUBLIC_API_URL no está definida — requerida con NEXT_PUBLIC_DATA_SOURCE=http',
    );
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return `${base}${path}${qs ? `?${qs}` : ''}`;
}

function requestInit(method: string, opts: ApiRequestOptions, body?: unknown): RequestInit {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const init: RequestInit & { next?: { revalidate: number } } = {
    method,
    headers,
    signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  // Datos de cuenta y escrituras nunca se cachean; el catálogo público sí
  // (revalidate en segundos, lo fija cada datasource).
  if (opts.revalidate === false || opts.revalidate === undefined) init.cache = 'no-store';
  else init.next = { revalidate: opts.revalidate };

  return init;
}

async function request(
  method: string,
  path: string,
  opts: ApiRequestOptions,
  body?: unknown,
): Promise<Response> {
  const url = buildUrl(path, opts.query);
  try {
    return await fetch(url, requestInit(method, opts, body));
  } catch (cause) {
    // fetch solo tira por fallas de red/abort — un 4xx/5xx llega como Response.
    throw new ApiRequestError(
      0,
      path,
      `${method} ${path} no pudo completarse: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

async function parse<T>(res: Response, method: string, path: string): Promise<T> {
  if (!res.ok) {
    throw new ApiRequestError(res.status, path, `${method} ${path} respondió ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiGet<T>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
  return parse<T>(await request('GET', path, opts), 'GET', path);
}

/**
 * Igual que `apiGet`, pero un 404 devuelve `null` en vez de tirar.
 *
 * Es la traducción del único desajuste sistemático entre el contrato mock y el
 * backend: los `getById()` del mock devuelven `null` cuando no encuentran, y
 * los services de NestJS tiran `NotFoundException` (404). El contrato que ven
 * los componentes no cambia — la diferencia muere aquí.
 */
export async function apiGetOrNull<T>(path: string, opts: ApiRequestOptions = {}): Promise<T | null> {
  const res = await request('GET', path, opts);
  if (res.status === 404) return null;
  return parse<T>(res, 'GET', path);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  opts: ApiRequestOptions = {},
): Promise<T> {
  return parse<T>(await request('POST', path, opts, body), 'POST', path);
}
