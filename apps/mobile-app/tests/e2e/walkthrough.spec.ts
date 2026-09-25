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
    // El nombre del plan lo traduce el cliente desde tierKey/periodKey (spec 011).
    await expect(page.getByText('15 SUCURSALES · MENSUAL', { exact: true })).toBeVisible();
    await expect(page.getByText('LISTO PARA RETIRO').first()).toBeVisible();
  });

  await test.step('cambiar el teléfono valida la forma y lo guarda en E.164 (spec 015)', async () => {
    const visible = (name: string) => page.getByRole('button', { name, exact: true }).filter({ visible: true });
    await visible('Cambiar').click();
    await page.getByLabel('Teléfono (10 dígitos)').fill('55 12');
    await visible('GUARDAR').click();
    await expect(page.getByText('Escribe un teléfono de 10 dígitos.')).toBeVisible();
    await page.getByLabel('Teléfono (10 dígitos)').fill('55 8765 4321');
    await visible('GUARDAR').click();
    await expect(page.getByText('Teléfono: +525587654321')).toBeVisible();
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
    // ENVIAR está deshabilitado con el campo vacío y se habilita en el siguiente
    // render: sin esperar, el click puede caer antes y no mandar nada (flaky).
    const send = page.getByRole('button', { name: 'ENVIAR', exact: true }).first();
    await expect(send).toBeEnabled();
    await send.click();
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
    // El color llega como nombre de la paleta (spec 010) y se pinta con theme.ts.
    await expect(page.getByText('94K', { exact: true })).toHaveCSS('color', 'rgb(225, 20, 28)');
    await expect(page.getByText('7d', { exact: true })).toHaveCSS('color', 'rgb(255, 224, 102)');
    await page.getByRole('button', { name: 'ENTRENAMIENTOS', exact: true }).click();
    await expect(page.getByText('Push Day · Pecho & Hombros')).toBeVisible();
    // Spec 017: los récords salen de la regla sobre lo registrado, no de un texto.
    await expect(page.getByText('🏆 Press de banca · 105 kg')).toBeVisible();
  });

  await test.step('registrar un entrenamiento: valida, calcula récord y volumen, y se puede borrar (spec 017)', async () => {
    await page.getByRole('button', { name: 'REGISTRAR ENTRENAMIENTO', exact: true }).click();
    await page.getByLabel('Nombre del entrenamiento').fill('Brazos');
    await page.getByLabel('Reps 1.1').fill('5');
    await page.getByLabel('Kg 1.1').fill('110');
    await page.getByRole('button', { name: 'GUARDAR ENTRENAMIENTO', exact: true }).click();
    await expect(page.getByText(/ponle nombre al entrenamiento y a cada ejercicio/)).toBeVisible();

    await page.getByLabel('Ejercicio 1').fill('press de banca');
    await page.getByRole('button', { name: 'GUARDAR ENTRENAMIENTO', exact: true }).click();
    await expect(page.getByText('Brazos', { exact: true })).toBeVisible();
    await expect(page.getByText('1 series · 550 kg vol')).toBeVisible();
    await expect(page.getByText('🏆 press de banca · 110 kg')).toBeVisible();

    await page.getByRole('button', { name: 'Borrar: Brazos' }).click();
    await page.getByRole('button', { name: 'SÍ, BORRAR', exact: true }).click();
    await expect(page.getByText('Brazos', { exact: true })).toHaveCount(0);
  });

  await test.step('rendimiento: heatmap', async () => {
    await page.getByRole('button', { name: 'HEATMAP', exact: true }).click();
    await expect(page.getByText(/Últimas 52 semanas/)).toBeVisible();
    // Spec 016: los cuadros marcados son las 6 visitas del historial de Diego, no un patrón al azar.
    await expect(page.getByLabel('Entrenamiento', { exact: true })).toHaveCount(6);
    await page.goBack();
  });

  // Facturar (spec 002). "FACTURAR" es a la vez el botón del panel y el de
  // cada cobro: con las pantallas de abajo del Stack en el DOM, se filtra por visible.
  const visibleButton = (name: string) => page.getByRole('button', { name, exact: true }).filter({ visible: true });
  const chip = (prefix: string) => page.getByRole('button', { name: new RegExp(`^${prefix} — `) }).filter({ visible: true });

  await test.step('facturar: los datos fiscales validan forma y filtran el uso por régimen', async () => {
    await visibleButton('FACTURAR').first().click();
    await expect(page.getByText('Primero, tus datos fiscales')).toBeVisible();
    await page.getByLabel('RFC', { exact: true }).fill('abcd');
    await visibleButton('GUARDAR DATOS').click();
    await expect(page.getByText('Esto no tiene forma de RFC.')).toBeVisible();

    await chip('612').click();
    await chip('G01').click();
    await chip('605').click();
    await expect(chip('G01')).toHaveCount(0);
    await expect(chip('S01')).toBeVisible();
  });

  await test.step('facturar: el SAT rechaza los datos, se corrigen y se emite la factura', async () => {
    await page.getByLabel('RFC', { exact: true }).fill('xaxx010101000');
    await page.getByLabel('Nombre o razón social').fill('diego ramírez');
    await chip('616').click();
    await page.getByLabel('Código postal').fill('06700');
    await chip('S01').click();
    await visibleButton('GUARDAR DATOS').click();
    await expect(page.getByText('Datos fiscales guardados.')).toBeVisible();
    await expect(page.getByText('XAXX010101000')).toBeVisible();
    await expect(page.getByText('Ya no facturable')).toBeVisible();

    await visibleButton('FACTURAR').first().click();
    await expect(page.getByText('CONFIRMA TU FACTURA')).toBeVisible();
    await visibleButton('EMITIR FACTURA').click();
    await expect(page.getByText('El SAT rechazó tus datos fiscales:')).toBeVisible();
    await expect(page.getByText(/RFC del receptor/)).toBeVisible();

    await visibleButton('CORREGIR MIS DATOS').click();
    await page.getByLabel('RFC', { exact: true }).fill('CUPU800825569');
    await chip('612').click();
    await chip('G03').click();
    await visibleButton('GUARDAR DATOS').click();
    await expect(page.getByText('CONFIRMA TU FACTURA')).toBeVisible();
    await visibleButton('EMITIR FACTURA').click();
    await expect(page.getByText(/ya está tu factura/)).toBeVisible();
    await expect(page.getByText('diego@mucholoco.mx').first()).toBeVisible();
  });

  await test.step('facturar: PDF se descarga y "¿Datos incorrectos?" abre WhatsApp con el folio', async () => {
    const [download] = await Promise.all([page.waitForEvent('download'), visibleButton('PDF').first().click()]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);

    // En web, expo-linking navega en la misma pestaña (en el teléfono abre
    // WhatsApp). Se intercepta esa navegación, se lee la URL y se responde 204:
    // con "No Content" el navegador no navega (abortarla dejaba la página de
    // error de Chrome), el app se queda donde estaba y no se sale a internet.
    let whatsapp = '';
    await page.route('https://wa.me/**', (route) => {
      whatsapp = route.request().url();
      return route.fulfill({ status: 204 });
    });
    await visibleButton('¿Datos incorrectos?').first().click();
    await expect.poll(() => whatsapp).toContain('wa.me');
    const url = new URL(whatsapp);
    expect(url.searchParams.get('text')).toMatch(/Folio fiscal: [0-9A-F-]{36}/);
    await page.unroute('https://wa.me/**');
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
    await expect(page.getByText('15 GYMS · MONTHLY', { exact: true })).toBeVisible();
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
    // El teléfono del registro llegó al perfil (spec 015): no pide agregarlo.
    await expect(page.getByText('Teléfono: +525512345678')).toBeVisible();
    await expect(page.getByText(/AGREGA TU TELÉFONO/)).toHaveCount(0);
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

  // Spec 005: en el mock, cada visita al portal de Stripe alterna la renovación.
  await test.step('administrar suscripción: cancela la renovación y la reactiva', async () => {
    await page.getByRole('button', { name: 'ADMINISTRAR SUSCRIPCIÓN', exact: true }).click();
    await expect(page.getByText(/Cancelaste la renovación: tienes acceso hasta el/)).toBeVisible();
    await expect(page.getByText(/Se renueva sola el/)).toHaveCount(0);

    await page.getByRole('button', { name: 'REACTIVAR RENOVACIÓN', exact: true }).click();
    await expect(page.getByText(/Se renueva sola el/)).toBeVisible();
  });

  expect(browserErrors).toEqual([]);
});

// Spec 015: quien entra con Google/Facebook no dio teléfono. En mock, cualquier
// correo sin datos curados llega igual: sin teléfono.
test('un socio sin teléfono lo completa desde su panel', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (e) => browserErrors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') browserErrors.push(`console.error: ${msg.text()}`);
  });

  await test.step('entra y ve el aviso de que falta su teléfono', async () => {
    await page.goto('/account');
    await expect(page.getByLabel('Email o usuario')).toBeVisible({ timeout: 120_000 });
    await page.getByLabel('Email o usuario').fill('social@mucholoco.mx');
    await page.getByLabel('Contraseña').fill('Bestia123!');
    await page.getByRole('button', { name: 'PRENDER LA MECHA' }).click();
    await expect(page.getByText(/AGREGA TU TELÉFONO/)).toBeVisible();
  });

  await test.step('un teléfono incompleto se rechaza sin guardar', async () => {
    await page.getByLabel('Teléfono (10 dígitos)').fill('55 12');
    await page.getByRole('button', { name: 'GUARDAR', exact: true }).click();
    await expect(page.getByText('Escribe un teléfono de 10 dígitos.')).toBeVisible();
    await expect(page.getByText(/AGREGA TU TELÉFONO/)).toBeVisible();
  });

  await test.step('con 10 dígitos se guarda y el aviso desaparece', async () => {
    await page.getByLabel('Teléfono (10 dígitos)').fill('55 1234 5678');
    await page.getByRole('button', { name: 'GUARDAR', exact: true }).click();
    await expect(page.getByText('Teléfono: +525512345678')).toBeVisible();
    await expect(page.getByText(/AGREGA TU TELÉFONO/)).toHaveCount(0);
  });

  expect(browserErrors).toEqual([]);
});
