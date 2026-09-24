export class ApiError extends Error {
  /** Código corto que la ruta devolvió en `{ error: string }`, cuando lo hay (ver lib/cognito-errors.ts). */
  code?: string;
  /** Status HTTP de la respuesta — p. ej. 401 cuando la sesión expiró a mitad del flujo. */
  status?: number;
  /** El cuerpo JSON completo del error, para rutas que mandan más que el código (`detail`, `charges`…). */
  data?: Record<string, unknown>;

  constructor(message: string, code?: string, status?: number, data?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

async function sendJson<T>(method: 'POST' | 'PUT', url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null) as ({ error?: string } & Record<string, unknown>) | null;
    throw new ApiError(`${method} ${url} failed with ${res.status}`, data?.error, res.status, data ?? undefined);
  }
  return res.json() as Promise<T>;
}

/** POSTs a JSON body and parses the JSON response. Throws ApiError on a non-2xx status. */
export function postJson<T>(url: string, body: unknown): Promise<T> {
  return sendJson<T>('POST', url, body);
}

/** Same as `postJson`, with PUT (replace a resource — p. ej. los datos fiscales). */
export function putJson<T>(url: string, body: unknown): Promise<T> {
  return sendJson<T>('PUT', url, body);
}
