import { describe, it, expect } from 'vitest';
import { userRepository } from './user.repository';
import { ALL_GYMS_TEST_EMAIL, SINGLE_GYM_TEST_EMAIL } from '../datasources/mock/user.mock';

describe('userRepository', () => {
  it('createOrder adds an order that then shows up in getOrders', async () => {
    const before = await userRepository.getOrders(ALL_GYMS_TEST_EMAIL);
    const items = [{ name: 'Test Product', flav: 'Test Flavor', img: '/assets/test.jpg', qty: 2 }];

    const created = await userRepository.createOrder(ALL_GYMS_TEST_EMAIL, items, 123, 'card', 'pickup');

    expect(created.items).toEqual(items);
    expect(created.total).toBe(123);
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
    const items = [{ name: 'Test Product', flav: 'Test Flavor', img: '/assets/test.jpg', qty: 1 }];
    const created = await userRepository.createOrder(ALL_GYMS_TEST_EMAIL, items, 290, 'cash', 'pickup');
    expect(created.status).toBe('pending_payment');
  });

  it('creates non-cash orders as ready immediately', async () => {
    const items = [{ name: 'Test Product', flav: 'Test Flavor', img: '/assets/test.jpg', qty: 1 }];
    const created = await userRepository.createOrder(ALL_GYMS_TEST_EMAIL, items, 290, 'transfer', 'pickup');
    expect(created.status).toBe('ready');
  });

  it('gives the single-gym test user a membership scoped to one branch', async () => {
    const membership = await userRepository.getMembership(SINGLE_GYM_TEST_EMAIL);
    expect(membership.tierKey).toBe('single');
    expect(membership.branch).toBe('Condesa');

    const history = await userRepository.getVisitHistory(SINGLE_GYM_TEST_EMAIL);
    expect(history.every((v) => v.branch === 'Condesa')).toBe(true);
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
    await userRepository.createOrder(ALL_GYMS_TEST_EMAIL, [], 0, 'card', 'pickup');
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
