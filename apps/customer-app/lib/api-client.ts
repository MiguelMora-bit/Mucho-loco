export class ApiError extends Error {
  /** Código corto que la ruta devolvió en `{ error: string }`, cuando lo hay (ver lib/cognito-errors.ts). */
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

/** POSTs a JSON body and parses the JSON response. Throws ApiError on a non-2xx status. */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null) as { error?: string } | null;
    throw new ApiError(`POST ${url} failed with ${res.status}`, data?.error);
  }
  return res.json() as Promise<T>;
}
