import { test, expect } from '@playwright/test';
import { E2E_TEST_EMAIL, E2E_TEST_PASSWORD } from './global-setup';

test.describe('auth', () => {
  // Serial a propósito: estos tests comparten un único usuario Cognito real
  // (E2E_TEST_EMAIL) y hacen InitiateAuth de verdad contra AWS — en paralelo
  // el mismo usuario dispara throttling intermitente del lado de Cognito.
  test.describe.configure({ mode: 'serial' });

  test('unauthenticated visit to /dashboard redirects to /account with a next param', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/account\?next=%2Fdashboard$/);
  });

  test('unauthenticated visit to /performance redirects to /account with a next param', async ({ page }) => {
    await page.goto('/performance');
    await expect(page).toHaveURL(/\/account\?next=%2Fperformance$/);
  });

  test('wrong password shows a real Cognito error, not a redirect', async ({ page }) => {
    await page.goto('/account');
    await page.fill('input[name="email"]', E2E_TEST_EMAIL);
    await page.fill('input[name="password"]', 'contraseña-incorrecta');
    await page.locator('button:has-text("PRENDER LA MECHA")').click();
    await expect(page.getByText('Email o contraseña incorrectos')).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);
  });

  test('logging in redirects to /dashboard and shows the welcome pane', async ({ page }) => {
    await page.goto('/account');
    await page.fill('input[name="email"]', E2E_TEST_EMAIL);
    await page.fill('input[name="password"]', E2E_TEST_PASSWORD);
    await page.locator('button:has-text("PRENDER LA MECHA")').click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('BIENVENIDO')).toBeVisible();
  });

  test('logging in with a next param returns to the originally requested page', async ({ page }) => {
    await page.goto('/performance'); // bounces to /account?next=/performance
    await page.fill('input[name="email"]', E2E_TEST_EMAIL);
    await page.fill('input[name="password"]', E2E_TEST_PASSWORD);
    await page.locator('button:has-text("PRENDER LA MECHA")').click();
    await expect(page).toHaveURL(/\/performance$/);
  });

  test('a forged ml_session cookie is rejected, not trusted', async ({ page, context, request }) => {
    // El middleware solo comprueba que la cookie EXISTA (ver middleware.ts) —
    // esta prueba confirma que lib/jwt.ts realmente verifica la firma contra
    // Cognito y no solo decodifica el payload. Sin esto, cualquiera podía
    // editar la cookie a mano en devtools con un JWT fabricado y suplantar a
    // otro usuario (ver auditoría de seguridad 2026-09-10).
    const forgeHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const forgePayload = Buffer.from(JSON.stringify({
      email: 'victima@mucholoco.mx',
      name: 'IMPOSTOR',
      token_use: 'id',
      exp: 9999999999,
    })).toString('base64url');
    const forgedJwt = `${forgeHeader}.${forgePayload}.firma-inventada`;

    await context.addCookies([{
      name: 'ml_session',
      value: forgedJwt,
      domain: 'localhost',
      path: '/',
    }]);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/account$/);

    const ordersResponse = await request.post('/api/orders', {
      headers: { Cookie: `ml_session=${forgedJwt}` },
      data: { items: [], total: 0, paymentMethod: 'card', delivery: 'pickup' },
    });
    expect(ordersResponse.status()).toBe(401);
  });

  test('logging out clears the session — a protected route bounces to /account again', async ({ page }) => {
    await page.goto('/account');
    await page.fill('input[name="email"]', E2E_TEST_EMAIL);
    await page.fill('input[name="password"]', E2E_TEST_PASSWORD);
    await page.locator('button:has-text("PRENDER LA MECHA")').click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.locator('.logout-btn').click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/account\?next=%2Fdashboard$/);
  });

  test('refresh renews ml_session without rotating ml_refresh', async ({ page, context, request }) => {
    await page.goto('/account');
    await page.fill('input[name="email"]', E2E_TEST_EMAIL);
    await page.fill('input[name="password"]', E2E_TEST_PASSWORD);
    await page.locator('button:has-text("PRENDER LA MECHA")').click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const cookiesBefore = await context.cookies();
    const sessionBefore = cookiesBefore.find((c) => c.name === 'ml_session')?.value;
    const refreshToken = cookiesBefore.find((c) => c.name === 'ml_refresh')?.value;
    expect(refreshToken).toBeTruthy();

    const res = await request.post('/api/auth/refresh', {
      headers: { Cookie: `ml_refresh=${refreshToken}` },
    });
    expect(res.status()).toBe(200);

    const setCookie = res.headers()['set-cookie'] ?? '';
    expect(setCookie).toContain('ml_session=');
    expect(setCookie).not.toContain('ml_refresh='); // REFRESH_TOKEN_AUTH no rota el refresh token
    const newSessionMatch = setCookie.match(/ml_session=([^;]+)/);
    expect(newSessionMatch?.[1]).toBeTruthy();
    expect(newSessionMatch?.[1]).not.toBe(sessionBefore); // Cognito emite un ID token nuevo, no el mismo
  });
});
