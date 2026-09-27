import type { NotificationPreferences } from '@mucho-loco/types';
import type { NotificationKind, User } from '@prisma/client';

/**
 * Cada aviso pertenece a una de las tres categorías que el socio prende o
 * apaga en Configuración (spec 053). Un `Record` sobre el enum: agregar un
 * aviso nuevo sin decidir su categoría no compila.
 */
export const NOTIFICATION_CATEGORY: Record<NotificationKind, keyof NotificationPreferences> = {
  membership_expiring: 'membership',
  membership_grace: 'membership',
  order_ready: 'orders',
  order_shipped: 'orders',
  payment_confirmed: 'payments',
};

export function preferencesOf(
  user: Pick<User, 'notifyMembership' | 'notifyOrders' | 'notifyPayments'>,
): NotificationPreferences {
  return { membership: user.notifyMembership, orders: user.notifyOrders, payments: user.notifyPayments };
}

export function allows(preferences: NotificationPreferences, kind: NotificationKind): boolean {
  return preferences[NOTIFICATION_CATEGORY[kind]];
}
