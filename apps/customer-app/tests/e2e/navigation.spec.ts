import { test, expect } from '@playwright/test';

test.describe('navigation', () => {
  test('clicking MI CUENTA right after page load reaches /account', async ({ page }) => {
    // Regression test: the announcement splash used to auto-open ~900ms after
    // load and its full-screen backdrop would eat this click (closing itself
    // instead of navigating). See lib note in components/MuchoLoco.tsx.
    await page.goto('/');
    await page.locator('a.login-btn').click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByText('PRENDER LA MECHA')).toBeVisible();
  });

  test('the announcement splash can be dismissed without blocking further navigation', async ({ page }) => {
    await page.goto('/');
    const splash = page.locator('.announcement-splash');
    if (await splash.isVisible({ timeout: 500 }).catch(() => false)) {
      await page.locator('.announcement-splash-close').click();
      await expect(splash).toBeHidden();
    }
    await page.locator('a.login-btn').click();
    await expect(page).toHaveURL(/\/account$/);
  });
});
