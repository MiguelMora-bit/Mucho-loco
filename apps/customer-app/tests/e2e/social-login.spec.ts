import { test, expect } from '@playwright/test';

// Estos dos no necesitan el usuario Cognito real de global-setup.ts ni tocan
// AWS: social/start solo construye un redirect y social/callback falla antes
// de intentar el intercambio de código cuando faltan code/state/cookie — el
// login social de verdad (consent screen de Google/Facebook) no se puede
// automatizar en e2e, ver apps/customer-app/CLAUDE.md.
test.describe('social login', () => {
  test('the Google button redirects straight to the Hosted UI authorize endpoint (skips the picker)', async ({ request }) => {
    const res = await request.get('/api/auth/social/start?provider=Google&next=/dashboard', { maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    const location = res.headers()['location'];
    expect(location).toContain('/oauth2/authorize');
    expect(location).toContain('identity_provider=Google');
  });

  test('an unsupported provider bounces to /account instead of Cognito', async ({ request }) => {
    const res = await request.get('/api/auth/social/start?provider=Twitter', { maxRedirects: 0 });
    expect(res.headers()['location']).toMatch(/\/account$/);
  });

  test('a callback with no code/state fails closed to /account?error=SOCIAL_LOGIN_FAILED', async ({ request }) => {
    const res = await request.get('/api/auth/social/callback', { maxRedirects: 0 });
    expect(res.headers()['location']).toMatch(/\/account\?error=SOCIAL_LOGIN_FAILED$/);
  });

  test('a callback carrying an IdP error param fails closed without attempting the token exchange', async ({ request }) => {
    const res = await request.get('/api/auth/social/callback?error=access_denied', { maxRedirects: 0 });
    expect(res.headers()['location']).toMatch(/\/account\?error=SOCIAL_LOGIN_FAILED$/);
  });
});
