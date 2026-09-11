import { describe, it, expect } from 'vitest';
import { POST } from './route';

describe('POST /api/auth/logout', () => {
  it('clears both session cookies', async () => {
    const res = await POST();
    expect(await res.json()).toEqual({ ok: true });
    expect(res.cookies.get('ml_session')?.value).toBeFalsy();
    expect(res.cookies.get('ml_refresh')?.value).toBeFalsy();
  });
});
