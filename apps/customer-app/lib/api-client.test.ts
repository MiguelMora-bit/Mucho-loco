import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postJson, putJson, ApiError } from './api-client';

describe('postJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('POSTs a JSON body and returns the parsed response on 2xx', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, user: { email: 'diego@mucholoco.mx' } }),
    });

    const data = await postJson<{ ok: boolean }>('/api/auth/login', { email: 'diego@mucholoco.mx', password: 'x' });

    expect(data).toEqual({ ok: true, user: { email: 'diego@mucholoco.mx' } });
    expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'diego@mucholoco.mx', password: 'x' }),
    });
  });

  it('throws an ApiError carrying the server error code on a non-2xx response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'WRONG_CREDENTIALS' }),
    });

    const err = await postJson('/api/auth/login', {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('WRONG_CREDENTIALS');
    expect((err as ApiError).message).toBe('POST /api/auth/login failed with 401');
  });

  it('still throws an ApiError when the error response body is not valid JSON', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new SyntaxError('not json'); },
    });

    const err = await postJson('/api/orders', {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBeUndefined();
  });
});

describe('putJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('PUTs a JSON body', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ saved: true }) });
    await expect(putJson('/api/invoicing/fiscal-profile', { taxId: 'X' })).resolves.toEqual({ saved: true });
    expect(fetch).toHaveBeenCalledWith('/api/invoicing/fiscal-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxId: 'X' }),
    });
  });

  it('keeps the status and the whole error body — detail, charges — not just the code', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'FISCAL_DATA_REJECTED', detail: 'El RFC no existe' }),
    });
    await expect(putJson('/x', {})).rejects.toMatchObject({
      code: 'FISCAL_DATA_REJECTED',
      status: 422,
      data: { detail: 'El RFC no existe' },
    });
  });
});
