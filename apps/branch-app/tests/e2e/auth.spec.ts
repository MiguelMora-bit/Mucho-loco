import { test, expect } from '@playwright/test';

// Cuentas reales de dev, dadas de alta con AdminCreateUser + grupo
// staff/manager (ver CLAUDE.md de este app y de la raíz — no hay self-signup
// acá). Ambas asignadas a Roma Sur en staffDirectory.ts.
const MANAGER_EMAIL = 'ana@mucholoco.mx';
const MANAGER_PASSWORD = 'Bestia123!';
const STAFF_EMAIL = 'luis@mucholoco.mx';
const STAFF_PASSWORD = 'Bestia123!';
// Cuenta real pero sin grupo staff/manager (cliente de customer-app).
const NON_STAFF_EMAIL = 'diego@mucholoco.mx';
const NON_STAFF_PASSWORD = 'Bestia123!';

test.describe('auth', () => {
  test.describe.configure({ mode: 'serial' });

  test('unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('a real account without staff/manager group is rejected', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', NON_STAFF_EMAIL);
    await page.fill('input[name="password"]', NON_STAFF_PASSWORD);
    await page.click('button:has-text("Entrar")');
    await expect(page.getByText('no tiene permiso de staff')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logging in as staff shows the counter role and assigned branch', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', STAFF_EMAIL);
    await page.fill('input[name="password"]', STAFF_PASSWORD);
    await page.click('button:has-text("Entrar")');
    await expect(page).toHaveURL('/');
    await expect(page.getByText('LUIS DOMÍNGUEZ')).toBeVisible();
    await expect(page.locator('header')).toContainText('ROMA SUR');
    await expect(page.locator('header')).toContainText('Mostrador');
  });

  test('a staff member cannot self-escalate by editing the cached role in localStorage', async ({ page }) => {
    // ProtectedRoute solía confiar en el `user` cacheado (incluido `role`)
    // sin re-verificar nada (ver auditoría de seguridad 2026-09-10) — Luis
    // podía editar su propio localStorage y aparentar ser gerente sin tocar
    // su token real. Ahora el rol se re-deriva del JWT verificado cada vez.
    await page.goto('/login');
    await page.fill('input[name="email"]', STAFF_EMAIL);
    await page.fill('input[name="password"]', STAFF_PASSWORD);
    await page.click('button:has-text("Entrar")');
    await expect(page).toHaveURL('/');

    await page.evaluate(() => {
      const raw = localStorage.getItem('ml_staff_session');
      const parsed = JSON.parse(raw!);
      parsed.state.user.role = 'manager';
      localStorage.setItem('ml_staff_session', JSON.stringify(parsed));
    });
    await page.reload();
    await expect(page.locator('header')).toContainText('Mostrador', { timeout: 15000 });
    await expect(page.locator('header')).not.toContainText('Gerente');

    const storedRole = await page.evaluate(() => JSON.parse(localStorage.getItem('ml_staff_session')!).state.user.role);
    expect(storedRole).toBe('staff');
  });

  test('logging in as manager shows the manager role', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', MANAGER_EMAIL);
    await page.fill('input[name="password"]', MANAGER_PASSWORD);
    await page.click('button:has-text("Entrar")');
    await expect(page).toHaveURL('/');
    await expect(page.locator('header')).toContainText('Gerente');
  });

  test('a manager sees the cash register nav item and can open it', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', MANAGER_EMAIL);
    await page.fill('input[name="password"]', MANAGER_PASSWORD);
    await page.click('button:has-text("Entrar")');
    await expect(page).toHaveURL('/');

    await page.click('text=Caja');
    await expect(page).toHaveURL('/cash-register');
    await expect(page.getByText('Corte de caja')).toBeVisible();
  });

  test('staff does not see the cash register nav item, and visiting the URL directly bounces to /', async ({ page }) => {
    // Roles en sucursal (ver CLAUDE.md raíz): gerente = caja/reportes,
    // mostrador = pedidos/cobro/QR — el corte de caja es la primera
    // restricción real por rol en este app (antes el rol solo se mostraba).
    await page.goto('/login');
    await page.fill('input[name="email"]', STAFF_EMAIL);
    await page.fill('input[name="password"]', STAFF_PASSWORD);
    await page.click('button:has-text("Entrar")');
    await expect(page).toHaveURL('/');

    await expect(page.locator('header')).not.toContainText('Caja');

    await page.goto('/cash-register');
    await expect(page).toHaveURL('/');
  });

  test('a forged session in localStorage is rejected, not trusted', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('ml_staff_session', JSON.stringify({
        state: {
          user: { email: 'atacante@evil.com', name: 'ATACANTE', role: 'manager', branchId: 1, branchName: 'Roma Sur' },
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
