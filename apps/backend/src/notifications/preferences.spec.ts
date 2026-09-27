import { allows, NOTIFICATION_CATEGORY, preferencesOf } from './preferences';

// Spec 053: cada aviso pertenece a una de las tres categorías de Configuración.
describe('notification preferences', () => {
  it('maps every kind to the category the member sees in settings', () => {
    expect(NOTIFICATION_CATEGORY).toEqual({
      membership_expiring: 'membership',
      membership_grace: 'membership',
      order_ready: 'orders',
      order_shipped: 'orders',
      payment_confirmed: 'payments',
    });
  });

  it('allows only the kinds whose category is on', () => {
    const prefs = { membership: true, orders: false, payments: true };

    expect(allows(prefs, 'membership_grace')).toBe(true);
    expect(allows(prefs, 'order_ready')).toBe(false);
    expect(allows(prefs, 'order_shipped')).toBe(false);
    expect(allows(prefs, 'payment_confirmed')).toBe(true);
  });

  it('reads the preferences off the user row', () => {
    expect(preferencesOf({ notifyMembership: false, notifyOrders: true, notifyPayments: false })).toEqual({
      membership: false,
      orders: true,
      payments: false,
    });
  });
});
