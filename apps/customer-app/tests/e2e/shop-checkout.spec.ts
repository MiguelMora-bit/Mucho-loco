import { test, expect } from '@playwright/test';
import { E2E_TEST_EMAIL, E2E_TEST_PASSWORD } from './global-setup';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/account');
  await page.fill('input[name="email"]', E2E_TEST_EMAIL);
  await page.fill('input[name="password"]', E2E_TEST_PASSWORD);
  await page.locator('button:has-text("PRENDER LA MECHA")').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/**
 * "Recoger en gym" (la entrega por defecto del checkout) sale de la sucursal
 * de la membresía, y una cuenta nueva ya no nace con una. En modo mock la
 * compra se activa al instante. Si la cuenta ya la tenía de una corrida
 * anterior (el servidor de dev conserva el estado), el botón está
 * deshabilitado y no hay nada que hacer.
 */
async function ensureMembership(page: import('@playwright/test').Page) {
  await page.goto('/membership?plan=all&period=monthly&branch=1');
  const pay = page.getByRole('button', { name: 'IR A PAGAR' });
  if (await pay.isEnabled()) {
    await pay.click();
    await expect(page).toHaveURL(/\/dashboard\?membership=paid$/);
  }
}

test.describe('shop -> checkout -> order shows up in dashboard', () => {
  test('adding a product, checking out, and seeing the order in the dashboard', async ({ page }) => {
    await login(page);
    await ensureMembership(page);

    // Add a product to the cart from the shop grid on the home page.
    await page.goto('/');
    const firstAddButton = page.locator('.product-card .add-btn').first();
    await firstAddButton.click();

    // Go to checkout and place the order.
    await page.goto('/checkout');
    await page.locator('button:has-text("CONTINUAR AL PAGO")').click();
    // Tarjeta = Stripe: aquí no se captura ningún dato de tarjeta. En modo mock
    // el "cobro" es instantáneo y regresa a ?paid=1, que es la confirmación.
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
