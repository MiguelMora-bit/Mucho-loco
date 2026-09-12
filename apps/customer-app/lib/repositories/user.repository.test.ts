import { describe, it, expect } from 'vitest';
import { userRepository } from './user.repository';
import { ALL_GYMS_TEST_EMAIL, SINGLE_GYM_TEST_EMAIL, OrderValidationError } from '../datasources/mock/user.mock';
import { PRODUCTS } from '../data';
import { HOME_SHIPPING_FEE } from '../pricing';

const WHEY = PRODUCTS.find((p) => p.id === 'p1')!;   // 'Whey Protein 5LBS'
const PRE = PRODUCTS.find((p) => p.id === 'p7')!;    // nombre distinto en es/en

describe('userRepository', () => {
  it('createOrder adds an order that then shows up in getOrders', async () => {
    const before = await userRepository.getOrders(ALL_GYMS_TEST_EMAIL);

    const created = await userRepository.createOrder(
      ALL_GYMS_TEST_EMAIL,
      [{ productId: WHEY.id, qty: 2 }],
      'card',
      'pickup',
      'es',
    );

    // El total sale del catálogo, no de lo que mandó el cliente — misma regla
    // que UsersService.createOrder() del backend (ver apps/backend/CLAUDE.md).
    expect(created.items).toEqual([
      { name: WHEY.name.es, flav: WHEY.flav.es, img: WHEY.img, qty: 2 },
    ]);
    expect(created.total).toBe(WHEY.price * 2);
    expect(created.status).toBe('ready');
    expect(created.id).toMatch(/^#ML-/);
    expect(created.paymentMethod).toBe('card');
    expect(created.delivery).toBe('pickup');
    expect(created.branch).toBeTruthy();

    const after = await userRepository.getOrders(ALL_GYMS_TEST_EMAIL);
    expect(after).toHaveLength(before.length + 1);
    expect(after[0].id).toBe(created.id);
  });

  // Efectivo solo se puede elegir con "recoger en gym" (ver CLAUDE.md raíz,
  // "Pagos en línea") — el pedido queda pendiente de pago hasta que se cobra
  // en mostrador, no "listo para retiro" como si ya estuviera pagado.
  it('creates cash orders as pending payment instead of ready', async () => {
    const created = await userRepository.createOrder(
      ALL_GYMS_TEST_EMAIL, [{ productId: WHEY.id, qty: 1 }], 'cash', 'pickup', 'es');
    expect(created.status).toBe('pending_payment');
  });

  it('creates non-cash orders as ready immediately', async () => {
    const created = await userRepository.createOrder(
      ALL_GYMS_TEST_EMAIL, [{ productId: WHEY.id, qty: 1 }], 'transfer', 'pickup', 'es');
    expect(created.status).toBe('ready');
  });

  it('adds the shipping fee only when the order is delivered home', async () => {
    const home = await userRepository.createOrder(
      ALL_GYMS_TEST_EMAIL, [{ productId: WHEY.id, qty: 1 }], 'card', 'home', 'es');
    expect(home.total).toBe(WHEY.price + HOME_SHIPPING_FEE);
    expect(home.branch).toBeUndefined();

    const pickup = await userRepository.createOrder(
      ALL_GYMS_TEST_EMAIL, [{ productId: WHEY.id, qty: 1 }], 'card', 'pickup', 'es');
    expect(pickup.total).toBe(WHEY.price);
  });

  // Efectivo es exclusivo de "recoger en gym" — a domicilio no hay quien cobre
  // (ver CLAUDE.md raíz, "Pagos en línea"). El backend responde 400; el mock
  // tiene que rechazarlo igual o el swap de datasource cambiaría el checkout.
  it('rejects cash payment for a home delivery', async () => {
    await expect(
      userRepository.createOrder(ALL_GYMS_TEST_EMAIL, [{ productId: WHEY.id, qty: 1 }], 'cash', 'home', 'es'),
    ).rejects.toBeInstanceOf(OrderValidationError);
  });

  it('rejects an order that references a product outside the catalog', async () => {
    await expect(
      userRepository.createOrder(ALL_GYMS_TEST_EMAIL, [{ productId: 'no-existe', qty: 1 }], 'card', 'pickup', 'es'),
    ).rejects.toBeInstanceOf(OrderValidationError);
  });

  // Un pedido es un recibo congelado en el idioma de compra, no se retraduce
  // (ver CLAUDE.md de este app) — por eso lang es parte del contrato.
  it('freezes the receipt text in the language the order was placed in', async () => {
    const es = await userRepository.createOrder(
      ALL_GYMS_TEST_EMAIL, [{ productId: PRE.id, qty: 1 }], 'card', 'pickup', 'es');
    const en = await userRepository.createOrder(
      ALL_GYMS_TEST_EMAIL, [{ productId: PRE.id, qty: 1 }], 'card', 'pickup', 'en');

    expect(es.items[0].name).toBe(PRE.name.es);
    expect(en.items[0].name).toBe(PRE.name.en);
    expect(PRE.name.es).not.toBe(PRE.name.en);
  });

  it('gives the single-gym test user a membership scoped to one branch', async () => {
    const membership = await userRepository.getMembership(SINGLE_GYM_TEST_EMAIL);
    expect(membership.tierKey).toBe('single');
    expect(membership.branch).toBe('Condesa');

    const history = await userRepository.getVisitHistory(SINGLE_GYM_TEST_EMAIL);
    expect(history.every((v) => v.branch === 'Condesa')).toBe(true);
  });

  // El backend real emite estas dos fechas en ISO. Si el mock volviera al
  // texto español pre-formateado ("20 JUL 2026"), el dashboard se rompería
  // solo al prender NEXT_PUBLIC_DATA_SOURCE=http, porque las pinta con
  // lib/dates.ts — que necesita una fecha parseable, no un string ya armado.
  // Una visita ya no viaja como texto pre-armado ('18'/'JUN'/'1h 24m'): con
  // eso la pantalla no podía cambiar de idioma y el backend tenía que
  // formatear en español. Ahora manda el dato y el frontend decide.
  it('exposes visits as an ISO instant plus real minutes', async () => {
    const [visit] = await userRepository.getVisitHistory(ALL_GYMS_TEST_EMAIL);

    expect(Number.isNaN(Date.parse(visit.visitedAt))).toBe(false);
    expect(typeof visit.durationMinutes).toBe('number');
    expect(visit.durationMinutes).toBeGreaterThan(0);
  });

  it('exposes membership dates as ISO, the same shape the backend returns', async () => {
    const membership = await userRepository.getMembership(SINGLE_GYM_TEST_EMAIL);

    expect(membership.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(Number.isNaN(Date.parse(membership.expiresAt))).toBe(false);
    expect(membership.graceEndsAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it('keeps membership dates ISO after a payment retry extends them', async () => {
    const updated = await userRepository.retryMembershipPayment(ALL_GYMS_TEST_EMAIL);

    expect(updated.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(updated.graceEndsAt).toBeNull();
  });

  it('gives an unknown account a real expiry date instead of a placeholder', async () => {
    const membership = await userRepository.getMembership('desconocido@mucholoco.mx');

    expect(Number.isNaN(Date.parse(membership.expiresAt))).toBe(false);
  });

  it('gives the all-gyms test user a membership scoped to every branch', async () => {
    const membership = await userRepository.getMembership(ALL_GYMS_TEST_EMAIL);
    expect(membership.tierKey).toBe('all');
  });

  it('seeds the single-gym test user in a failed-payment grace period', async () => {
    const membership = await userRepository.getMembership(SINGLE_GYM_TEST_EMAIL);
    expect(membership.status).toBe('grace');
    expect(membership.graceEndsAt).toBeTruthy();
  });

  it('retryMembershipPayment clears grace/expired status and extends access', async () => {
    const updated = await userRepository.retryMembershipPayment(SINGLE_GYM_TEST_EMAIL);
    expect(updated.status).toBe('active');
    expect(updated.graceEndsAt).toBeNull();
    expect(updated.daysLeft).toBe(30);

    const persisted = await userRepository.getMembership(SINGLE_GYM_TEST_EMAIL);
    expect(persisted.status).toBe('active');
  });

  // El QR de acceso es un código fijo que NO rota (ver CLAUDE.md raíz,
  // "QR de acceso") — el dashboard lo pinta una sola vez y el socio se lo
  // enseña en la sucursal cuantas veces quiera durante toda su vigencia. Si
  // getMembership() alguna vez regresara un accessCode distinto entre
  // llamadas, el QR guardado en la pantalla del socio dejaría de servir.
  it('keeps the same accessCode across repeated reads (QR does not rotate)', async () => {
    const first = await userRepository.getMembership(ALL_GYMS_TEST_EMAIL);
    const second = await userRepository.getMembership(ALL_GYMS_TEST_EMAIL);
    expect(second.accessCode).toBe(first.accessCode);

    // Sobrevive también a una acción no relacionada sobre el mismo usuario.
    await userRepository.createOrder(ALL_GYMS_TEST_EMAIL, [], 'card', 'pickup', 'es');
    const afterUnrelatedAction = await userRepository.getMembership(ALL_GYMS_TEST_EMAIL);
    expect(afterUnrelatedAction.accessCode).toBe(first.accessCode);
  });

  // branch-app valida el QR real contra sus propios MEMBER_ACCESS_RECORDS
  // mock (apps/branch-app/src/lib/data.ts), hardcodeados con ESTOS mismos
  // strings a propósito ("el QR que un socio ve en su dashboard de verdad se
  // puede escanear acá" — ver CLAUDE.md de branch-app, sección "QR real").
  // No hay una sola fuente de verdad compartida todavía (cada app trae su
  // propio mock), así que este test es la única red que detecta que los dos
  // mocks se desincronizaron si alguien cambia uno sin el otro.
  it('keeps the curated test users\' accessCode in sync with the codes branch-app expects', async () => {
    const allGyms = await userRepository.getMembership(ALL_GYMS_TEST_EMAIL);
    expect(allGyms.accessCode).toBe('ML-DIEGO-2026-ALLGYMS');

    const singleGym = await userRepository.getMembership(SINGLE_GYM_TEST_EMAIL);
    expect(singleGym.accessCode).toBe('ML-VALERIA-2026-CONDESA');
  });
});
