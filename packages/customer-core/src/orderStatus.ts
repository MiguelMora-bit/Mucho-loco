import type { OrderStatus, Translations } from '@mucho-loco/types';

/**
 * `delivery` importa en 'ready': un pedido a domicilio pagado no está "listo
 * para retiro" — nadie lo recoge, falta mandarlo.
 */
export function orderStatusLabel(
  status: OrderStatus,
  t: Translations,
  delivery: 'pickup' | 'home' = 'pickup',
): string {
  switch (status) {
    case 'pending_payment':
      return t.dashboard.orders.pendingPayment;
    case 'ready':
      return delivery === 'home' ? t.dashboard.orders.preparingShipment : t.dashboard.orders.ready;
    case 'shipped':
      return t.dashboard.orders.shipped;
    case 'done':
      return t.dashboard.orders.delivered;
  }
}
