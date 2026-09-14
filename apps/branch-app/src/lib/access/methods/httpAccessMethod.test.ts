import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  qrHttpAccessMethod,
  fingerprintHttpAccessMethod,
  nameHttpAccessMethod,
} from './httpAccessMethod';
import { useAuthStore } from '../../stores/auth.store';

function stubFetch(body: unknown = { outcome: 'not_found' }) {
  const spy = vi.fn(
    async (_url: string | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

const urlOf = (spy: ReturnType<typeof stubFetch>, i = 0) => String(spy.mock.calls[i][0]);

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'http://api.test');
  useAuthStore.getState().setSession({
    user: { email: 'luis@mucholoco.mx', name: 'Luis', role: 'staff', branchId: 1, branchName: 'Roma Sur' },
    idToken: 'id-token',
    refreshToken: 'r',
    idTokenExp: Math.floor(Date.now() / 1000) + 3600,
  });
});

afterEach(() => {
  useAuthStore.getState().clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('HTTP access methods', () => {
  // Los tres pegan al MISMO endpoint porque los tres terminan en la misma
  // regla de acceso — separarlos duplicaría esa regla en tres rutas.
  it('all three hit the same endpoint, differing only in the query key', async () => {
    const spy = stubFetch();

    await qrHttpAccessMethod.checkAccess('ML-QR-ABC', 1);
    await fingerprintHttpAccessMethod.checkAccess('fp-1', 1);
    await nameHttpAccessMethod.checkAccess('Diego', 1);

    expect(urlOf(spy, 0)).toContain('/branches/1/member-access?');
    expect(urlOf(spy, 0)).toContain('qrCode=ML-QR-ABC');
    expect(urlOf(spy, 1)).toContain('fingerprintId=fp-1');
    expect(urlOf(spy, 2)).toContain('name=Diego');
  });

  it('keeps the id each method reports, so the UI can tell them apart', () => {
    expect(qrHttpAccessMethod.id).toBe('qr');
    expect(fingerprintHttpAccessMethod.id).toBe('fingerprint');
    expect(nameHttpAccessMethod.id).toBe('name');
  });

  it('sends the branch, because the access rule depends on where the member is', async () => {
    const spy = stubFetch();
    await qrHttpAccessMethod.checkAccess('ML-QR-ABC', 5);

    expect(urlOf(spy)).toContain('/branches/5/member-access');
  });

  // Un lector físico puede añadir un salto de línea al final del código.
  it('trims the scanned value', async () => {
    const spy = stubFetch();
    await qrHttpAccessMethod.checkAccess('  ML-QR-ABC\n', 1);

    expect(urlOf(spy)).toContain('qrCode=ML-QR-ABC');
    expect(urlOf(spy)).not.toContain('%0A');
  });

  // El backend rechaza un query vacío con 400; preguntarle por nada no aporta.
  it('answers not_found for an empty query without calling the backend', async () => {
    const spy = stubFetch();

    await expect(qrHttpAccessMethod.checkAccess('   ', 1)).resolves.toEqual({ outcome: 'not_found' });
    expect(spy).not.toHaveBeenCalled();
  });

  // La regla la evalúa el SERVIDOR: este código solo transporta el resultado.
  it('passes the server verdict through untouched', async () => {
    stubFetch({ outcome: 'wrong_branch', record: { memberName: 'Valeria Torres' } });

    const result = await qrHttpAccessMethod.checkAccess('ML-QR-VAL', 1);

    expect(result.outcome).toBe('wrong_branch');
  });
});
