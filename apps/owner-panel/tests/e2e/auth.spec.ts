import { test, expect } from '@playwright/test';

// Cuenta real de dev, dada de alta con AdminCreateUser + grupo 'owner' (ver
// CLAUDE.md de este app y de la raíz — no hay self-signup en este panel).
const OWNER_EMAIL = 'rodrigo@mucholoco.mx';
const OWNER_PASSWORD = 'Bestia123!';
// Cuenta real pero SIN el grupo 'owner' (cliente de customer-app) — sirve
// para probar el rechazo por rol.
const NON_OWNER_EMAIL = 'diego@mucholoco.mx';
const NON_OWNER_PASSWORD = 'Bestia123!';

test.describe('auth', () => {
  test.describe.configure({ mode: 'serial' });

  test('unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('wrong password shows a real Cognito error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', OWNER_EMAIL);
    await page.fill('input[name="password"]', 'contraseña-incorrecta');
    await page.click('button:has-text("Entrar")');
    await expect(page.getByText('Email o contraseña incorrectos')).toBeVisible();
  });

  test('a real account without the owner group is rejected', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', NON_OWNER_EMAIL);
    await page.fill('input[name="password"]', NON_OWNER_PASSWORD);
    await page.click('button:has-text("Entrar")');
    await expect(page.getByText('no tiene permiso de dueño')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logging in as a real owner reaches the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', OWNER_EMAIL);
    await page.fill('input[name="password"]', OWNER_PASSWORD);
    await page.click('button:has-text("Entrar")');
    await expect(page).toHaveURL('/');
    await expect(page.getByText('RODRIGO CASTAÑEDA')).toBeVisible();
  });

  test('a forged session in localStorage is rejected, not trusted', async ({ page }) => {
    // ProtectedRoute solía confiar en el `user` cacheado sin verificar nada
    // (ver auditoría de seguridad 2026-09-10) — cualquiera podía escribir esto
    // a mano en devtools sin haber hecho login real. Ahora debe re-verificar
    // el idToken contra Cognito y rechazar tokens/refresh tokens inventados.
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('ml_owner_session', JSON.stringify({
        state: {
          user: { email: 'atacante@evil.com', name: 'ATACANTE' },
          idToken: 'header.eyJlbWFpbCI6ImF0YWNhbnRlQGV2aWwuY29tIn0.firma-inventada',
          refreshToken: 'refresh-token-inventado',
          idTokenExp: 9999999999,
        },
        version: 0,
      }));
    });
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });
  });
});
