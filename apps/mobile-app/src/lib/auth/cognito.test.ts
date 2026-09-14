import { afterEach, describe, expect, it, vi } from 'vitest';
import { CognitoAuthService, type SocialPrompt } from './cognito';
import type { Session } from './types';

// Cognito real no se puede ejercer sin un User Pool vivo (infra destruida).
// Lo que sí se prueba aquí: que cada operación arma EXACTAMENTE la request que
// el API de Cognito espera, y que cada respuesta se traduce bien.

const config = { region: 'us-east-1', clientId: 'mobile-client', domain: 'https://ml.auth.us-east-1.amazoncognito.com' };

/** JWT de mentira: solo importa el payload (el teléfono no verifica firma). */
function jwt(claims: Record<string, unknown>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(claims));
  const payload = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `h.${payload}.s`;
}

const idToken = jwt({ email: 'diego@mucholoco.mx', exp: 2_000_000_000, token_use: 'id' });

function stubFetch(status: number, body: unknown) {
  const spy = vi.fn(
    async (_url: string | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

const call = (spy: ReturnType<typeof stubFetch>, i = 0) => {
  const init = (spy.mock.calls[i][1] ?? {}) as RequestInit;
  return {
    url: String(spy.mock.calls[i][0]),
    headers: init.headers as Record<string, string>,
    body: String(init.body),
    json: () => JSON.parse(String(init.body)) as Record<string, unknown>,
  };
};

const noPrompt: SocialPrompt = async () => null;
const session: Session = { email: 'diego@mucholoco.mx', idToken: 'old', refreshToken: 'refresh-1', expiresAt: 0 };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('signIn', () => {
  it('calls InitiateAuth USER_PASSWORD_AUTH on the regional endpoint, with no secret', async () => {
    const spy = stubFetch(200, { AuthenticationResult: { IdToken: idToken, RefreshToken: 'refresh-1' } });
    await new CognitoAuthService(config, noPrompt).signIn(' diego@mucholoco.mx ', 'Bestia123!');

    const c = call(spy);
    expect(c.url).toBe('https://cognito-idp.us-east-1.amazonaws.com/');
    expect(c.headers['X-Amz-Target']).toBe('AWSCognitoIdentityProviderService.InitiateAuth');
    expect(c.headers['Content-Type']).toBe('application/x-amz-json-1.1');
    expect(c.json()).toEqual({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: 'mobile-client',
      AuthParameters: { USERNAME: 'diego@mucholoco.mx', PASSWORD: 'Bestia123!' },
    });
    expect(c.body).not.toMatch(/SECRET_HASH/);
  });

  it('builds the session from the ID token claims', async () => {
    stubFetch(200, { AuthenticationResult: { IdToken: idToken, RefreshToken: 'refresh-1' } });
    const s = await new CognitoAuthService(config, noPrompt).signIn('diego@mucholoco.mx', 'Bestia123!');

    expect(s).toEqual({
      email: 'diego@mucholoco.mx',
      idToken,
      refreshToken: 'refresh-1',
      expiresAt: 2_000_000_000_000,
    });
  });

  it('translates the JSON API __type into the shared error codes', async () => {
    stubFetch(400, { __type: 'NotAuthorizedException', message: 'Incorrect username or password.' });
    await expect(new CognitoAuthService(config, noPrompt).signIn('x@y.mx', 'nope1234')).rejects.toMatchObject({
      code: 'WRONG_CREDENTIALS',
    });

    stubFetch(400, { __type: 'UserNotConfirmedException' });
    await expect(new CognitoAuthService(config, noPrompt).signIn('x@y.mx', 'Bestia123!')).rejects.toMatchObject({
      code: 'NOT_CONFIRMED',
    });
  });

  it('refuses a challenge instead of pretending it logged in', async () => {
    stubFetch(200, { ChallengeName: 'NEW_PASSWORD_REQUIRED', Session: 's' });
    await expect(new CognitoAuthService(config, noPrompt).signIn('x@y.mx', 'Bestia123!')).rejects.toMatchObject({
      code: 'UNKNOWN',
    });
  });
});

describe('signUp / confirm / resend', () => {
  it('signs up with email, name and the phone in E.164', async () => {
    const spy = stubFetch(200, { UserConfirmed: false, UserSub: 'sub-1' });
    await new CognitoAuthService(config, noPrompt).signUp({
      name: ' Nueva Bestia ',
      email: 'nueva@mucholoco.mx',
      password: 'Bestia123!',
      phone: '55 1234 5678',
    });

    const c = call(spy);
    expect(c.headers['X-Amz-Target']).toBe('AWSCognitoIdentityProviderService.SignUp');
    expect(c.json()).toEqual({
      ClientId: 'mobile-client',
      Username: 'nueva@mucholoco.mx',
      Password: 'Bestia123!',
      UserAttributes: [
        { Name: 'email', Value: 'nueva@mucholoco.mx' },
        { Name: 'name', Value: 'Nueva Bestia' },
        { Name: 'phone_number', Value: '+525512345678' },
      ],
    });
  });

  it('rejects an invalid phone before calling Cognito', async () => {
    const spy = stubFetch(200, {});
    await expect(
      new CognitoAuthService(config, noPrompt).signUp({ name: 'X', email: 'x@y.mx', password: 'Bestia123!', phone: '123' }),
    ).rejects.toMatchObject({ code: 'INVALID_PHONE' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('confirms with the emailed code and can resend it', async () => {
    const spy = stubFetch(200, {});
    const auth = new CognitoAuthService(config, noPrompt);
    await auth.confirmSignUp('nueva@mucholoco.mx', ' 123456 ');
    await auth.resendCode('nueva@mucholoco.mx');

    expect(call(spy, 0).headers['X-Amz-Target']).toBe('AWSCognitoIdentityProviderService.ConfirmSignUp');
    expect(call(spy, 0).json()).toEqual({ ClientId: 'mobile-client', Username: 'nueva@mucholoco.mx', ConfirmationCode: '123456' });
    expect(call(spy, 1).headers['X-Amz-Target']).toBe('AWSCognitoIdentityProviderService.ResendConfirmationCode');
  });
});

describe('refresh / signOut', () => {
  it('refreshes with REFRESH_TOKEN_AUTH and keeps the same refresh token', async () => {
    const spy = stubFetch(200, { AuthenticationResult: { IdToken: idToken } });
    const fresh = await new CognitoAuthService(config, noPrompt).refresh(session);

    expect(call(spy).json()).toEqual({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: 'mobile-client',
      AuthParameters: { REFRESH_TOKEN: 'refresh-1' },
    });
    expect(fresh.idToken).toBe(idToken);
    expect(fresh.refreshToken).toBe('refresh-1');
  });

  it('fails as WRONG_CREDENTIALS when the refresh token was revoked or expired', async () => {
    stubFetch(400, { __type: 'NotAuthorizedException', message: 'Refresh Token has been revoked' });
    await expect(new CognitoAuthService(config, noPrompt).refresh(session)).rejects.toMatchObject({
      code: 'WRONG_CREDENTIALS',
    });
  });

  it('signs out by revoking this device refresh token', async () => {
    const spy = stubFetch(200, {});
    await new CognitoAuthService(config, noPrompt).signOut(session);

    expect(call(spy).headers['X-Amz-Target']).toBe('AWSCognitoIdentityProviderService.RevokeToken');
    expect(call(spy).json()).toEqual({ Token: 'refresh-1', ClientId: 'mobile-client' });
  });
});

describe('social login', () => {
  it('offers Google and Facebook only when the Hosted UI domain is configured', () => {
    expect(new CognitoAuthService(config, noPrompt).socialProviders).toEqual(['Google', 'Facebook']);
    expect(new CognitoAuthService({ region: 'us-east-1', clientId: 'c' }, noPrompt).socialProviders).toEqual([]);
  });

  it('exchanges the code with the PKCE verifier and no client secret', async () => {
    const prompt = vi.fn<SocialPrompt>(async () => ({
      code: 'the-code',
      codeVerifier: 'the-verifier',
      redirectUri: 'mucholoco://auth/callback',
    }));
    const spy = stubFetch(200, { id_token: idToken, refresh_token: 'refresh-2', access_token: 'a' });

    const s = await new CognitoAuthService(config, prompt).signInWithProvider('Google');

    expect(prompt).toHaveBeenCalledWith(config, 'Google');
    const c = call(spy);
    expect(c.url).toBe('https://ml.auth.us-east-1.amazoncognito.com/oauth2/token');
    expect(c.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(Object.fromEntries(new URLSearchParams(c.body))).toEqual({
      grant_type: 'authorization_code',
      client_id: 'mobile-client',
      code: 'the-code',
      redirect_uri: 'mucholoco://auth/callback',
      code_verifier: 'the-verifier',
    });
    expect(c.body).not.toMatch(/client_secret/);
    expect(s).toMatchObject({ email: 'diego@mucholoco.mx', refreshToken: 'refresh-2' });
  });

  it('returns null, without a token request, when the member closes the browser', async () => {
    const spy = stubFetch(200, {});
    await expect(new CognitoAuthService(config, noPrompt).signInWithProvider('Facebook')).resolves.toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('fails as SOCIAL_LOGIN_FAILED when the token endpoint rejects the code', async () => {
    const prompt: SocialPrompt = async () => ({ code: 'c', codeVerifier: 'v', redirectUri: 'mucholoco://auth/callback' });
    stubFetch(400, { error: 'invalid_grant' });
    await expect(new CognitoAuthService(config, prompt).signInWithProvider('Google')).rejects.toMatchObject({
      code: 'SOCIAL_LOGIN_FAILED',
    });
  });
});
