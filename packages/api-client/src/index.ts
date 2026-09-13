/**
 * Cliente HTTP del backend de Mucho Loco, compartido por los frontends.
 *
 * Lo que vive aquí es lo que era idéntico en todos: construcción de URL,
 * query string, cabecera `Authorization`, timeout, parseo, y la traducción de
 * un 404 a `null` (los `getById()` de los repositorios devuelven `null` y los
 * services de NestJS tiran `NotFoundException`).
 *
 * Lo que NO vive aquí, porque de verdad difiere por app, se inyecta al crear
 * el cliente: de dónde sale el token y qué caché usar.
 */

/**
 * Un status no-2xx del backend. `status` 0 significa que la request nunca
 * salió o no terminó (red caída, DNS, timeout).
 */
export class ApiRequestError extends Error {
  // Campos declarados y asignados a mano, no parameter properties: los apps de
  // Vite compilan con `erasableSyntaxOnly`, que las prohíbe.
  readonly status: number;
  readonly path: string;
  readonly body: Record<string, unknown>;

  constructor(status: number, path: string, message: string, body: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.path = path;
    this.body = body;
  }

  /**
   * Código de negocio que promete `common/error-codes.ts` del backend, cuando
   * lo hay. Es lo que deja a un datasource traducir el fallo a un error tipado
   * del contrato sin leer el mensaje en prosa.
   */
  get code(): string | undefined {
    return typeof this.body.code === 'string' ? this.body.code : undefined;
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

/** Opciones que se pasan tal cual a `fetch`. Aquí caben las de Next (`next.revalidate`). */
export type FetchExtras = RequestInit & { next?: { revalidate: number } };

export interface ApiClientConfig {
  /** Base del API, sin slash final. Función y no string: en Vite/Next el valor se lee del entorno al llamar, no al importar. */
  baseUrl: () => string;
  /** Token de sesión. `undefined` significa "no hay sesión" y dispara `missingTokenMessage`. */
  getToken?: () => string | undefined | Promise<string | undefined>;
  /** Qué decir cuando se pide una ruta autenticada sin sesión. Cada app sabe dónde vive su token. */
  missingTokenMessage?: string;
  /** Query que se agrega a TODA request — `?lang=` en los apps que lo necesitan. */
  defaultQuery?: () => QueryParams;
  /** Qué decir cuando falta la variable de entorno con la base del API. */
  missingBaseUrlMessage?: string;
  timeoutMs?: number;
  /**
   * Cómo traduce este app el `maxAgeSeconds` de una request a opciones de
   * `fetch`. Existe para que un datasource compartido pueda decir "este dato
   * aguanta 5 minutos" sin saber en qué plataforma corre: Next lo vuelve
   * `next.revalidate` (y `no-store` cuando no hay edad); el móvil y las SPA no
   * lo configuran y la opción no hace nada.
   */
  cachePolicy?: (maxAgeSeconds: number | undefined) => FetchExtras;
}

export interface RequestOptions {
  query?: QueryParams;
  /** `false` para endpoints públicos (catálogo). Default: manda token si el cliente sabe conseguirlo. */
  auth?: boolean;
  /** Cuánto puede tener de viejo este dato. Sin valor = siempre fresco. Lo interpreta `cachePolicy`. */
  maxAgeSeconds?: number;
  /** Opciones crudas de `fetch` — ganan sobre las de `cachePolicy`. */
  fetch?: FetchExtras;
  timeoutMs?: number;
}

export interface ApiClient {
  get<T>(path: string, opts?: RequestOptions): Promise<T>;
  /** Igual que `get`, pero un 404 devuelve `null` en vez de tirar. */
  getOrNull<T>(path: string, opts?: RequestOptions): Promise<T | null>;
  post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>;
}

interface RawResponse {
  status: number;
  ok: boolean;
  text: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export function createApiClient(config: ApiClientConfig): ApiClient {
  function buildUrl(path: string, query: QueryParams | undefined): string {
    const base = config.baseUrl();
    if (!base) {
      throw new ApiRequestError(
        0,
        path,
        config.missingBaseUrlMessage ?? 'Falta la URL base del API',
      );
    }
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...config.defaultQuery?.(), ...query })) {
      if (value !== undefined) search.set(key, String(value));
    }
    const qs = search.toString();
    return `${base.replace(/\/+$/, '')}${path}${qs ? `?${qs}` : ''}`;
  }

  async function authorization(path: string, wanted: boolean | undefined): Promise<string | undefined> {
    const useAuth = wanted ?? Boolean(config.getToken);
    if (!useAuth || !config.getToken) return undefined;

    const token = await config.getToken();
    if (!token) {
      throw new Error(
        config.missingTokenMessage ?? `Sin sesión para llamar ${path}`,
      );
    }
    return `Bearer ${token}`;
  }

  async function send(
    method: string,
    path: string,
    opts: RequestOptions,
    body: unknown,
  ): Promise<RawResponse> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const auth = await authorization(path, opts.auth);
    if (auth) headers.Authorization = auth;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const url = buildUrl(path, opts.query);

    // AbortController + setTimeout, y NO `AbortSignal.timeout()`: React Native
    // trae AbortController vía el polyfill `abort-controller`, que no
    // implementa `timeout()` — ahí cada request tronaría antes de salir.
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      opts.timeoutMs ?? config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        ...config.cachePolicy?.(opts.maxAgeSeconds),
        ...opts.fetch,
      });
      // El cuerpo se lee DENTRO del timeout: un backend que manda los headers
      // y se cuelga a media respuesta también cuenta como colgado.
      return { status: res.status, ok: res.ok, text: await res.text() };
    } catch (cause) {
      // fetch solo tira por fallas de red/abort — un 4xx/5xx llega como Response.
      throw new ApiRequestError(
        0,
        path,
        `${method} ${path} no pudo completarse: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  function parse<T>(res: RawResponse, method: string, path: string): T {
    if (!res.ok) {
      let body: Record<string, unknown> = {};
      try {
        const parsed: unknown = res.text ? JSON.parse(res.text) : {};
        if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
      } catch {
        // Un error sin JSON (un proxy devolviendo HTML) sigue siendo un error con status.
      }
      throw new ApiRequestError(res.status, path, `${method} ${path} respondió ${res.status}`, body);
    }
    // Cuerpo vacío = `undefined`, no una excepción. Pasa de verdad: un handler
    // de Nest que devuelve `null` (por ejemplo "este empleado no tiene turno
    // abierto") responde 200 sin cuerpo, y parsear eso tira un SyntaxError que
    // no tiene nada que ver con lo que salió mal.
    if (!res.text) return undefined as T;
    return JSON.parse(res.text) as T;
  }

  return {
    async get<T>(path: string, opts: RequestOptions = {}): Promise<T> {
      return parse<T>(await send('GET', path, opts, undefined), 'GET', path);
    },
    async getOrNull<T>(path: string, opts: RequestOptions = {}): Promise<T | null> {
      const res = await send('GET', path, opts, undefined);
      if (res.status === 404) return null;
      return parse<T>(res, 'GET', path);
    },
    async post<T>(path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
      // body ?? {} y no `body`: un POST sin cuerpo (cerrar turno, reintentar
      // pago) igual debe mandar `{}`, no `undefined` — si no, el cliente
      // omitiría el Content-Type y el ValidationPipe del backend recibe vacío.
      return parse<T>(await send('POST', path, opts, body ?? {}), 'POST', path);
    },
  };
}
