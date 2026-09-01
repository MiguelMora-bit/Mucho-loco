export class ApiError extends Error {}

/** POSTs a JSON body and parses the JSON response. Throws ApiError on a non-2xx status. */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new ApiError(`POST ${url} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}
