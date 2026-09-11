import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubEnv('VITE_COGNITO_REGION', 'us-east-1');
vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_test123');
vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');

const jwtVerifyMock = vi.fn();
vi.mock('jose', () => ({
  createRemoteJWKSet: () => 'jwks-handle',
  jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args),
}));

const { verifyIdToken } = await import('./jwt');

beforeEach(() => {
  jwtVerifyMock.mockReset();
});

describe('verifyIdToken', () => {
  it('verifies against the pool JWKS with the exact issuer and audience (regression: the 2026-09-10 auth-bypass fix relies on this)', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { token_use: 'id', email: 'luis@mucholoco.mx', name: 'Luis', 'cognito:groups': ['staff'], exp: 123 } });

    await verifyIdToken('a-jwt');

    expect(jwtVerifyMock).toHaveBeenCalledWith('a-jwt', 'jwks-handle', {
      issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test123',
      audience: 'test-client-id',
    });
  });

  it('returns email, name, groups and exp from a valid ID token', async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: { token_use: 'id', email: 'luis@mucholoco.mx', name: 'Luis', 'cognito:groups': ['staff'], exp: 1234567890 },
    });
    expect(await verifyIdToken('a-jwt')).toEqual({
      email: 'luis@mucholoco.mx', name: 'Luis', groups: ['staff'], exp: 1234567890,
    });
  });

  it('defaults groups to an empty array when the token has no cognito:groups claim (a customer token, not staff)', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { token_use: 'id', email: 'x@mucholoco.mx', name: 'X' } });
    expect((await verifyIdToken('a-jwt')).groups).toEqual([]);
  });

  it('rejects a token that is not a Cognito ID token', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { token_use: 'access' } });
    await expect(verifyIdToken('an-access-token')).rejects.toThrow('Token is not a Cognito ID token');
  });

  it('propagates jose verification failures — this is what stops a hand-written localStorage token from being trusted', async () => {
    jwtVerifyMock.mockRejectedValue(new Error('signature verification failed'));
    await expect(verifyIdToken('a-forged-jwt')).rejects.toThrow('signature verification failed');
  });
});
