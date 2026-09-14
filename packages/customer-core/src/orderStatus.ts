import type { OrderStatus, Translations } from '@mucho-loco/types';

export function orderStatusLabel(status: OrderStatus, t: Translations): string {
  switch (status) {
    case 'pending_payment':
      return t.dashboard.orders.pendingPayment;
    case 'ready':
      return t.dashboard.orders.ready;
    case 'done':
      return t.dashboard.orders.delivered;
  }
}
