import { test, expect } from '@playwright/test';

test.describe('auth', () => {
  test('unauthenticated visit to /dashboard redirects to /account with a next param', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/account\?next=%2Fdashboard$/);
  });

  test('unauthenticated visit to /performance redirects to /account with a next param', async ({ page }) => {
    await page.goto('/performance');
    await expect(page).toHaveURL(/\/account\?next=%2Fperformance$/);
  });

  test('logging in redirects to /dashboard and shows the welcome pane', async ({ page }) => {
    await page.goto('/account');
    await page.fill('input[name="email"]', 'diego@mucholoco.mx');
    await page.fill('input[name="password"]', 'anything');
    await page.locator('button:has-text("PRENDER LA MECHA")').click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('BIENVENIDO')).toBeVisible();
  });

  test('logging in with a next param returns to the originally requested page', async ({ page }) => {
    await page.goto('/performance'); // bounces to /account?next=/performance
    await page.fill('input[name="email"]', 'diego@mucholoco.mx');
    await page.locator('button:has-text("PRENDER LA MECHA")').click();
    await expect(page).toHaveURL(/\/performance$/);
  });
});
