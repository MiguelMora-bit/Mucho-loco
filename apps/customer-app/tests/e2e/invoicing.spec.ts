import { test, expect, type Page } from '@playwright/test';
import { E2E_TEST_EMAIL, E2E_TEST_PASSWORD } from './global-setup';

/**
 * Facturar (CFDI) contra el mock (NEXT_PUBLIC_DATA_SOURCE sin prender). Dos
 * cosas a saber antes de correrlo:
 *
 * - El login es contra Cognito REAL (igual que shop-checkout.spec.ts): sin
 *   User Pool vivo este archivo no corre. Los DATOS sí son mock.
 * - El mock vive en memoria del dev server y sobrevive entre corridas. Por eso
 *   cada test reescribe los datos fiscales que necesita y elige el cobro por
 *   su estado, nunca por su posición. Si se acaban los "Facturable", reiniciar
 *   `pnpm dev`.
 *
 * En serie: todos comparten el mismo socio y el mismo mock.
 */
test.describe.configure({ mode: 'serial' });

const VALID = { taxId: 'CUPU800825569', legalName: 'JUAN PÉREZ', taxSystem: '612', zip: '06700', cfdiUse: 'G03' };
const SAT_REJECTED = { taxId: 'XAXX010101000', legalName: 'JUAN PÉREZ', taxSystem: '616', zip: '06700', cfdiUse: 'S01' };

async function login(page: Page) {
  await page.goto('/account');
  await page.fill('input[name="email"]', E2E_TEST_EMAIL);
  await page.fill('input[name="password"]', E2E_TEST_PASSWORD);
  await page.locator('button:has-text("PRENDER LA MECHA")').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

const form = (page: Page) => page.getByRole('form', { name: 'DATOS FISCALES' });

/** Abre el formulario (si hay datos, con "EDITAR") y guarda estos valores. */
async function saveFiscal(page: Page, data: typeof VALID) {
  await page.goto('/invoicing');
  const edit = page.getByRole('button', { name: 'EDITAR' });
  if (await edit.isVisible()) await edit.click();
  await fillFiscal(page, data);
  await form(page).getByRole('button', { name: 'GUARDAR DATOS' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Datos fiscales guardados.' })).toBeVisible();
}

async function fillFiscal(page: Page, data: typeof VALID) {
  const f = form(page);
  await f.getByLabel('RFC').fill(data.taxId);
  await f.getByLabel('Nombre o razón social').fill(data.legalName);
  await f.getByLabel('Régimen fiscal').selectOption(data.taxSystem);
  await f.getByLabel('Código postal').fill(data.zip);
  await f.getByLabel('Uso del CFDI').selectOption(data.cfdiUse);
}

const charges = (page: Page, status: 'available' | 'invoiced' | 'closed' | 'unavailable') =>
  page.locator(`[data-charge-status="${status}"]`);

test.beforeEach(async ({ page }) => {
  await login(page);
});

test.describe('datos fiscales (US2)', () => {
  test('the form validates shape, filters CFDI use by regime, and saves normalized', async ({ page }) => {
    await page.goto('/invoicing');
    const edit = page.getByRole('button', { name: 'EDITAR' });
    if (await edit.isVisible()) await edit.click();
    const f = form(page);

    // US2-3: forma inválida → error junto al campo, nada se guarda.
    await f.getByLabel('RFC').fill('abcd');
    await f.getByLabel('Código postal').fill('123');
    await f.getByRole('button', { name: 'GUARDAR DATOS' }).click();
    await expect(f.getByText('Esto no tiene forma de RFC.')).toBeVisible();
    await expect(f.getByText('El código postal son 5 dígitos.')).toBeVisible();

    // US2-4: 605 (sueldos) solo admite S01; un G01 ya elegido se limpia.
    await f.getByLabel('Régimen fiscal').selectOption('612');
    await f.getByLabel('Uso del CFDI').selectOption('G01');
    await f.getByLabel('Régimen fiscal').selectOption('605');
    await expect(f.getByLabel('Uso del CFDI')).toHaveValue('');
    const uses = await f.getByLabel('Uso del CFDI').locator('option:not([value=""])').evaluateAll((os) =>
      os.map((o) => (o as HTMLOptionElement).value),
    );
    expect(uses).toEqual(['S01']);

    // US2-2: minúsculas y espacios → como en la constancia; persiste al recargar.
    await fillFiscal(page, { ...VALID, taxId: '  cupu800825569 ', legalName: ' juan pérez ' });
    await f.getByRole('button', { name: 'GUARDAR DATOS' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Datos fiscales guardados.' })).toBeVisible();
    await page.reload();
    await expect(page.getByText('CUPU800825569')).toBeVisible();
    await expect(page.getByText('JUAN PÉREZ')).toBeVisible();
  });

  test('editing the fiscal data shows the new data (US2-6)', async ({ page }) => {
    await saveFiscal(page, VALID);
    await saveFiscal(page, { ...VALID, zip: '03100' });
    await page.reload();
    await expect(page.getByText('03100')).toBeVisible();
  });
});

test.describe('facturar (US1)', () => {
  test('lists the charges with their state', async ({ page }) => {
    await page.goto('/invoicing');
    await expect(page.getByRole('heading', { name: 'TUS PAGOS' })).toBeVisible();
    // Uno de cada estado en la semilla del mock, con su etiqueta (FR-007).
    await expect(charges(page, 'closed').first()).toContainText('Ya no facturable');
    await expect(charges(page, 'unavailable').first()).toContainText('No facturable');
    // Solo los facturables ofrecen facturar (FR-009, US1-2, US1-3).
    await expect(charges(page, 'invoiced').getByRole('button', { name: 'FACTURAR' })).toHaveCount(0);
    await expect(charges(page, 'closed').getByRole('button', { name: 'FACTURAR' })).toHaveCount(0);
    // Montos con centavos (FR-016).
    await expect(page.getByText(/\$\s?[\d,]+\.\d{2}/).first()).toBeVisible();
  });

  test('invoices a charge after confirming, without reloading, and only once', async ({ page }) => {
    await saveFiscal(page, VALID);
    const target = charges(page, 'available').first();
    const id = await target.getAttribute('data-charge-id');
    await target.getByRole('button', { name: 'FACTURAR' }).click();

    const dialog = page.getByRole('dialog', { name: 'CONFIRMA TU FACTURA' });
    await expect(dialog).toContainText('CUPU800825569');
    await expect(dialog).toContainText('no se puede corregir desde la app'); // FR-010
    // Doble clic: una sola factura (FR-013, SC-004).
    await dialog.getByRole('button', { name: 'EMITIR FACTURA' }).dblclick();

    await expect(page.getByRole('status').filter({ hasText: 'ya está tu factura' })).toContainText(E2E_TEST_EMAIL);
    const row = page.locator(`[data-charge-id="${id}"]`);
    await expect(row).toHaveAttribute('data-charge-status', 'invoiced');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('without fiscal data, "Facturar" asks for them and comes back to the same charge (US2-5, FR-011)', async ({ page }) => {
    // Sin forma de borrar datos fiscales en la UI: se entra con ?charge= de un
    // cobro facturable y un perfil que el SAT rechaza no sirve para esto, así
    // que este caso solo corre en un mock recién arrancado.
    await page.goto('/invoicing');
    test.skip(await page.getByRole('button', { name: 'EDITAR' }).isVisible(), 'el socio ya tiene datos fiscales (mock no recién arrancado)');

    const target = charges(page, 'available').first();
    const id = await target.getAttribute('data-charge-id');
    await target.getByRole('button', { name: 'FACTURAR' }).click();
    await fillFiscal(page, VALID);
    await form(page).getByRole('button', { name: 'GUARDAR DATOS' }).click();

    const dialog = page.getByRole('dialog', { name: 'CONFIRMA TU FACTURA' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('data-charge-id', id!);
  });

  test('a session that expires mid-flow sends the member to log in', async ({ page, context }) => {
    await saveFiscal(page, VALID);
    await charges(page, 'available').first().getByRole('button', { name: 'FACTURAR' }).click();
    await context.clearCookies({ name: 'ml_session' });
    await page.getByRole('dialog').getByRole('button', { name: 'EMITIR FACTURA' }).click();
    await expect(page).toHaveURL(/\/account\?next=/);
  });

  test('/invoicing without a session redirects to /account (FR-017)', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/invoicing');
    await expect(page).toHaveURL(/\/account/);
  });
});

test.describe('descargas y corrección (US3)', () => {
  test('an invoiced charge offers its PDF and XML, and nothing else does', async ({ page }) => {
    await page.goto('/invoicing');
    const invoiced = charges(page, 'invoiced').first();

    const [pdf] = await Promise.all([page.waitForEvent('download'), invoiced.getByRole('link', { name: 'PDF' }).click()]);
    expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
    const [xml] = await Promise.all([page.waitForEvent('download'), invoiced.getByRole('link', { name: 'XML' }).click()]);
    expect(xml.suggestedFilename()).toMatch(/\.xml$/);

    await expect(charges(page, 'closed').getByRole('link', { name: 'PDF' })).toHaveCount(0);
    await expect(charges(page, 'unavailable').getByRole('link', { name: 'PDF' })).toHaveCount(0);
  });

  test('"¿Datos incorrectos?" opens WhatsApp with the charge and its folio (FR-020)', async ({ page }) => {
    await page.goto('/invoicing');
    const invoiced = charges(page, 'invoiced').first();
    const href = await invoiced.getByRole('link', { name: '¿Datos incorrectos?' }).getAttribute('href');

    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    const text = decodeURIComponent(new URL(href!).searchParams.get('text')!);
    const folio = await invoiced.getAttribute('data-charge-uuid');
    expect(text).toContain(folio!);
    expect(text).toContain((await invoiced.locator('[data-charge-description]').textContent())!.trim());
  });
});

test.describe('rechazo del SAT (US4)', () => {
  test("shows the SAT's reason, keeps the charge available, and lets the member fix and retry", async ({ page }) => {
    await saveFiscal(page, SAT_REJECTED);
    const target = charges(page, 'available').first();
    const id = await target.getAttribute('data-charge-id');
    await target.getByRole('button', { name: 'FACTURAR' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'EMITIR FACTURA' }).click();

    // US4-1: el motivo tal cual, el cobro sigue facturable.
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('El SAT rechazó tus datos fiscales');
    await expect(alert).toContainText('RFC');
    await expect(page.locator(`[data-charge-id="${id}"]`)).toHaveAttribute('data-charge-status', 'available');

    // US4-2: corregir desde el mensaje y reintentar ese mismo cobro.
    await alert.getByRole('button', { name: 'CORREGIR MIS DATOS' }).click();
    await fillFiscal(page, VALID);
    await form(page).getByRole('button', { name: 'GUARDAR DATOS' }).click();
    const dialog = page.getByRole('dialog', { name: 'CONFIRMA TU FACTURA' });
    await expect(dialog).toHaveAttribute('data-charge-id', id!);
    await dialog.getByRole('button', { name: 'EMITIR FACTURA' }).click();
    await expect(page.locator(`[data-charge-id="${id}"]`)).toHaveAttribute('data-charge-status', 'invoiced');
  });

  test('a server error is a connection error, never a SAT rejection', async ({ page }) => {
    await saveFiscal(page, VALID);
    await page.route('**/api/invoicing/charges/*/invoice', (route) => route.fulfill({ status: 500, body: 'boom' }));
    await charges(page, 'available').first().getByRole('button', { name: 'FACTURAR' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'EMITIR FACTURA' }).click();

    await expect(page.getByRole('alert')).toContainText('Error de conexión');
    await expect(page.getByRole('alert')).not.toContainText('SAT');
  });
});

test.describe('idioma (FR-016)', () => {
  test('labels and money follow English', async ({ page }) => {
    await page.goto('/en/invoicing');
    await expect(page.getByRole('heading', { name: 'YOUR PAYMENTS' })).toBeVisible();
    await expect(charges(page, 'invoiced').first()).toContainText('Invoiced');
    await expect(page.getByText(/MX\$[\d,]+\.\d{2}|\$[\d,]+\.\d{2}/).first()).toBeVisible();
  });
});
