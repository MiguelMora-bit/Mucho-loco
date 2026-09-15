import { expect, test, type Page } from '@playwright/test';

/**
 * El recorrido completo del socio, en orden, en una sola sesión de navegador:
 * cada paso depende del estado que dejó el anterior (carrito, sesión, pedido).
 *
 * Dos trampas de la versión web de un app de React Native, ya resueltas aquí:
 *
 * - Las pantallas de abajo del Stack siguen en el DOM (ocultas). Un texto
 *   puede estar dos veces — por eso `exact`, `.first()` o `filter({ visible })`.
 * - Los mocks viven en la memoria de la página: recargar los reinicia. El
 *   último paso recarga a propósito para probar que la sesión y el idioma
 *   sobreviven (llavero/AsyncStorage), no los datos.
 */

const tab = (page: Page, name: RegExp) =>
  page.getByRole('tab', { name }).or(page.getByRole('link', { name })).first();

test('el socio compra, entra, ve su QR, usa la comunidad y cambia de idioma', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (e) => browserErrors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') browserErrors.push(`console.error: ${msg.text()}`);
  });

  await test.step('el inicio pinta los textos compartidos con la web', async () => {
    await page.goto('/');
    await expect(page.getByText('ES HORA', { exact: true })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText('ÚNETE AL CAOS')).toBeVisible();
  });

  await test.step('avisos y membresías cargan de los repositorios', async () => {
    await expect(page.getByText('AVISOS', { exact: true })).toBeVisible();
    await expect(page.getByText('MÁS LOCO').first()).toBeVisible();
  });

  const addButtons = page.getByRole('button', { name: /^Al carrito:/ });

  await test.step('la tienda lista productos y el filtro de categoría reduce la lista', async () => {
    await tab(page, /Tienda/).click();
    await expect(addButtons.first()).toBeVisible();
    const before = await addButtons.count();

    await page.getByRole('button', { name: 'Gomitas' }).click();
    const after = await addButtons.count();
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);

    await page.getByRole('button', { name: 'Todo' }).click();
  });

  await test.step('agregar dos productos muestra la barra del carrito', async () => {
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();
    await expect(page.getByText(/VER CARRITO · 2 productos/)).toBeVisible();
  });

  await test.step('el detalle de producto agrega al carrito', async () => {
    await page.getByRole('link').filter({ hasText: /\$/ }).first().click();
    await page.getByRole('button', { name: 'AGREGAR AL CARRITO' }).click();
    await expect(page.getByRole('button', { name: /AGREGADO AL CARRITO/ })).toBeVisible();
    await page.getByRole('button', { name: 'Tu Bolsa Loca' }).click();
  });

  await test.step('el carrito deja cambiar cantidades y pasar a pagar', async () => {
    await expect(page.getByRole('button', { name: 'Pagar ahora' })).toBeVisible();
    await page.getByRole('button', { name: /^\+ / }).first().click();
    await page.getByRole('button', { name: 'Pagar ahora' }).click();
  });

  await test.step('sin sesión, el checkout pide login', async () => {
    await expect(page.getByText('INICIA SESIÓN PARA PAGAR')).toBeVisible();
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  });

  await test.step('el login mock rechaza una contraseña corta', async () => {
    await page.getByLabel('Email o usuario').fill('diego@mucholoco.mx');
    await page.getByLabel('Contraseña').fill('corta');
    await page.getByRole('button', { name: 'PRENDER LA MECHA' }).click();
    await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible();
  });

  await test.step('el login correcto regresa al checkout', async () => {
    await page.getByLabel('Contraseña').fill('Bestia123!');
    await page.getByRole('button', { name: 'PRENDER LA MECHA' }).click();
    await expect(page.getByText('MÉTODO DE PAGO')).toBeVisible();
  });

  await test.step('efectivo desaparece con entrega a domicilio', async () => {
    await expect(page.getByRole('button', { name: 'EFECTIVO EN SUCURSAL' })).toBeVisible();
    await page.getByRole('button', { name: 'A DOMICILIO' }).click();
    // exact: "ENVÍO A DOMICILIO" de la pantalla de producto (oculta) también contiene "Envío".
    await expect(page.getByText('Envío', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'EFECTIVO EN SUCURSAL' })).toHaveCount(0);
    // A domicilio pide la dirección, y sin ella no se manda nada: el error
    // sale antes de ir al servidor.
    await expect(page.getByLabel('Colonia')).toBeVisible();
    await page.getByRole('button', { name: /CONFIRMAR PEDIDO/ }).click();
    await expect(page.getByText(/Revisa la dirección/)).toBeVisible();
    await page.getByRole('button', { name: 'SUCURSAL', exact: true }).click();
  });

  await test.step('el pago con tarjeta pasa por la pasarela (mock) y confirma', async () => {
    await page.getByRole('button', { name: /CONFIRMAR PEDIDO/ }).click();
    await expect(page.getByText('CONFIRMADO!')).toBeVisible();
    await page.getByRole('button', { name: 'VER MI CUENTA' }).click();
  });

  await test.step('el panel muestra al socio y el pedido nuevo', async () => {
    await expect(page.getByText('BIENVENIDO,')).toBeVisible();
    await expect(page.getByText('DIEGO', { exact: true })).toBeVisible();
    await expect(page.getByText('LISTO PARA RETIRO').first()).toBeVisible();
  });

  await test.step('el QR de acceso es el código fijo del socio', async () => {
    await page.getByRole('button', { name: /MOSTRAR QR DE ACCESO/ }).click();
    await expect(page.getByText('ML-DIEGO-2026-ALLGYMS').first()).toBeVisible();
    await page.getByRole('button', { name: 'CERRAR' }).click();
  });

  await test.step('el detalle del pedido muestra el QR de retiro', async () => {
    await page.getByRole('button', { name: /^Ver pedido #ML-/ }).first().click();
    await expect(page.getByText('Muestra este código al llegar. Recoger en:', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'CERRAR', exact: true }).last().click();
    await expect(page.getByText('BIENVENIDO,')).toBeVisible();
  });

  await test.step('comunidad: publicar, dar like y comentar el post propio', async () => {
    await page.getByRole('button', { name: 'COMUNIDAD', exact: true }).click();
    await page.getByLabel('¿Qué entrenaste hoy?').fill('Pierna hoy, sin excusas 🔥');
    await page.getByRole('button', { name: 'PUBLICAR', exact: true }).click();
    // No basta con esperar el texto: el textarea lo contiene hasta que llega el
    // feed recargado. El encabezado del autor solo existe cuando el post ya
    // está en la lista (visible: el panel oculto de abajo también dice DIEGO RAMÍREZ).
    await expect(page.getByText('DIEGO RAMÍREZ', { exact: true }).filter({ visible: true })).toBeVisible();

    // Seed: Ana y Valeria con 1 like, Carlos con 0. El post nuevo queda arriba.
    const liked = page.getByRole('button', { name: 'Me gusta (1)' });
    const likedBefore = await liked.count();
    await page.getByRole('button', { name: 'Me gusta (0)' }).first().click();
    await expect(liked).toHaveCount(likedBefore + 1);

    const commented = page.getByRole('button', { name: 'Comentarios (1)' });
    const commentedBefore = await commented.count();
    await page.getByRole('button', { name: 'Comentarios (0)' }).first().click();
    await page.getByLabel('Escribe un comentario...').first().fill('¡Eso!');
    await page.getByRole('button', { name: 'ENVIAR', exact: true }).first().click();
    await expect(page.getByText('¡Eso!', { exact: true })).toBeVisible();
    await expect(commented).toHaveCount(commentedBefore + 1);

    // El like y el comentario cayeron en el post nuevo: Carlos sigue en cero.
    await expect(page.getByRole('button', { name: 'Me gusta (0)' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Comentarios (0)' })).toHaveCount(1);
    await page.goBack();
  });

  await test.step('rendimiento: resumen, entrenamientos y heatmap', async () => {
    await page.getByRole('button', { name: 'RENDIMIENTO', exact: true }).click();
    await expect(page.getByText('PRESS DE BANCA')).toBeVisible();
    await page.getByRole('button', { name: 'ENTRENAMIENTOS', exact: true }).click();
    await expect(page.getByText('Push Day · Pecho & Hombros')).toBeVisible();
    await page.getByRole('button', { name: 'HEATMAP', exact: true }).click();
    await expect(page.getByText(/Últimas 52 semanas/)).toBeVisible();
    await page.goBack();
  });

  await test.step('sucursales lista cada sucursal con cómo llegar', async () => {
    await tab(page, /Sucursales/).click();
    await expect(page.getByText('ROMA SUR').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'CÓMO LLEGAR' }).first()).toBeVisible();
  });

  await test.step('cambiar a inglés vuelve a pintar con en.json', async () => {
    await tab(page, /Cuenta/).click();
    await page.getByRole('button', { name: 'ENGLISH' }).click();
    await expect(page.getByText('WELCOME,')).toBeVisible();
  });

  await test.step('recargar conserva sesión e idioma; el carrito quedó vacío tras pagar', async () => {
    await page.reload();
    await tab(page, /Account/).click();
    await expect(page.getByText('WELCOME,')).toBeVisible({ timeout: 60_000 });
    await tab(page, /Shop/).click();
    await expect(page.getByRole('button', { name: 'VIEW CART' })).toHaveCount(0);
  });

  await test.step('cerrar sesión regresa al login', async () => {
    await tab(page, /Account/).click();
    await page.getByRole('button', { name: 'LOG OUT' }).click();
    await expect(page.getByLabel(/Email/).first()).toBeVisible();
  });

  expect(browserErrors).toEqual([]);
});

test('un socio nuevo se registra con teléfono, confirma el código y entra', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (e) => browserErrors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') browserErrors.push(`console.error: ${msg.text()}`);
  });

  await test.step('la pestaña Cuenta ofrece registrarse', async () => {
    await page.goto('/account');
    await expect(page.getByRole('button', { name: 'Registrarme' })).toBeVisible({ timeout: 120_000 });
    await page.getByRole('button', { name: 'Registrarme' }).click();
  });

  await test.step('un teléfono que no es de 10 dígitos se rechaza antes de crear la cuenta', async () => {
    await page.getByLabel('Nombre completo').fill('Nueva Bestia');
    await page.getByLabel('Email', { exact: true }).fill('nueva@mucholoco.mx');
    await page.getByLabel('Teléfono (WhatsApp)').fill('123');
    await page.getByLabel('Contraseña', { exact: true }).fill('Bestia123!');
    await page.getByRole('button', { name: 'SOLTAR LA BESTIA' }).click();
    await expect(page.getByText('Revisa tu teléfono: 10 dígitos, o con +52 al inicio.')).toBeVisible();
  });

  await test.step('con teléfono válido pide el código que llega por email', async () => {
    await page.getByLabel('Teléfono (WhatsApp)').fill('55 1234 5678');
    await page.getByRole('button', { name: 'SOLTAR LA BESTIA' }).click();
    await expect(page.getByLabel('Código de confirmación')).toBeVisible();
    await expect(page.getByText('nueva@mucholoco.mx', { exact: true })).toBeVisible();
  });

  await test.step('un código incorrecto se rechaza con el mismo mensaje que la web', async () => {
    await page.getByLabel('Código de confirmación').fill('000000');
    await page.getByRole('button', { name: 'CONFIRMAR CUENTA' }).click();
    await expect(page.getByText('Código incorrecto. Revisa e intenta de nuevo.')).toBeVisible();
  });

  await test.step('con el código correcto entra solo, sin volver a pedir contraseña', async () => {
    await page.getByLabel('Código de confirmación').fill('123456');
    await page.getByRole('button', { name: 'CONFIRMAR CUENTA' }).click();
    await expect(page.getByText('BIENVENIDO,')).toBeVisible();
    // Perfil genérico del mock para un email sin datos curados (fallbackRecord):
    // el nombre es el prefijo del email, así que sale en el saludo Y en el pase.
    await expect(page.getByText('NUEVA', { exact: true }).first()).toBeVisible();
  });

  // Antes una cuenta nueva nacía con una mensual de regalo. Ahora no tiene
  // membresía (ni QR) hasta que la compra.
  await test.step('una cuenta nueva no tiene membresía hasta comprarla', async () => {
    await expect(page.getByText(/AÚN NO TIENES MEMBRESÍA/)).toBeVisible();
    await expect(page.getByRole('button', { name: /MOSTRAR QR DE ACCESO/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'ELEGIR PLAN' }).click();
    await expect(page.getByText('ELIGE TU PLAN')).toBeVisible();
  });

  await test.step('elige plan y paga (mock): vuelve al panel con su QR y se renueva sola', async () => {
    await page.getByRole('button', { name: 'Trimestral', exact: true }).click();
    await expect(page.getByText(/MXN \/ trimestre/)).toBeVisible();
    await page.getByRole('button', { name: 'IR A PAGAR' }).click();
    await expect(page.getByRole('button', { name: /MOSTRAR QR DE ACCESO/ })).toBeVisible();
    await expect(page.getByText(/Se renueva sola el/)).toBeVisible();
  });

  expect(browserErrors).toEqual([]);
});
