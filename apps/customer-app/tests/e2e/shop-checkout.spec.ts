import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/account');
  await page.fill('input[name="email"]', 'diego@mucholoco.mx');
  await page.locator('button:has-text("PRENDER LA MECHA")').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('shop -> checkout -> order shows up in dashboard', () => {
  test('adding a product, checking out, and seeing the order in the dashboard', async ({ page }) => {
    await login(page);

    // Add a product to the cart from the shop grid on the home page.
    await page.goto('/');
    const firstAddButton = page.locator('.product-card .add-btn').first();
    await firstAddButton.click();

    // Go to checkout and place the order.
    await page.goto('/checkout');
    await page.locator('button:has-text("CONTINUAR AL PAGO")').click();
    await page.fill('input[placeholder="4242 4242 4242 4242"]', '4242424242424242');
    await page.fill('input[placeholder="12/27"]', '12/30');
    await page.fill('input[placeholder="123"]', '123');
    await page.fill('input[placeholder="DIEGO RAMÍREZ"]', 'TEST USER');
    await page.locator('button:has-text("CONFIRMAR PEDIDO")').click();
    await expect(page.locator('.confirm-screen')).toBeVisible();

    // The order should now be visible in the dashboard's orders pane — this
    // only works because the order is created server-side via /api/orders,
    // in the same process the dashboard's server component reads from.
    await page.goto('/dashboard');
    await page.locator('button:has-text("MIS PEDIDOS")').click();
    await expect(page.locator('.order-card').first()).toBeVisible();
  });
});
