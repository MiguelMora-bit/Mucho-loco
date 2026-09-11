import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.COGNITO_REGION = 'us-east-1';
process.env.COGNITO_USER_POOL_ID = 'us-east-1_test123';
process.env.COGNITO_CLIENT_ID = 'test-client-id';

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
  it('verifies against the pool JWKS with the exact issuer and audience (regression: this is what the 2026-09-10 auth-bypass fix relies on)', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { token_use: 'id', email: 'diego@mucholoco.mx', name: 'Diego' } });

    await verifyIdToken('a-jwt');

    expect(jwtVerifyMock).toHaveBeenCalledWith('a-jwt', 'jwks-handle', {
      issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test123',
      audience: 'test-client-id',
    });
  });

  it('returns email and name from a valid ID token', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { token_use: 'id', email: 'diego@mucholoco.mx', name: 'Diego' } });
    expect(await verifyIdToken('a-jwt')).toEqual({ email: 'diego@mucholoco.mx', name: 'Diego' });
  });

  it('defaults email/name to empty string when the payload omits them', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { token_use: 'id' } });
    expect(await verifyIdToken('a-jwt')).toEqual({ email: '', name: '' });
  });

  it('rejects a token that is not a Cognito ID token (e.g. an access token)', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { token_use: 'access', email: 'diego@mucholoco.mx' } });
    await expect(verifyIdToken('an-access-token')).rejects.toThrow('Token is not a Cognito ID token');
  });

  it('propagates jose verification failures (bad signature, wrong issuer/audience, expired)', async () => {
    jwtVerifyMock.mockRejectedValue(new Error('signature verification failed'));
    await expect(verifyIdToken('a-forged-jwt')).rejects.toThrow('signature verification failed');
  });
});
