import { describe, it, expect } from 'vitest';
import { orderStatusLabel } from './orderStatus';
import type { Translations } from '@mucho-loco/types';

const t = {
  dashboard: {
    orders: {
      ready: 'LISTO PARA RETIRO',
      pendingPayment: 'PENDIENTE DE PAGO',
      delivered: 'ENTREGADO',
      preparingShipment: 'PREPARANDO ENVÍO',
      shipped: 'EN CAMINO',
    },
  },
} as Translations;

describe('orderStatusLabel', () => {
  it('maps each OrderStatus to its translated label', () => {
    expect(orderStatusLabel('pending_payment', t)).toBe('PENDIENTE DE PAGO');
    expect(orderStatusLabel('ready', t)).toBe('LISTO PARA RETIRO');
    expect(orderStatusLabel('shipped', t)).toBe('EN CAMINO');
    expect(orderStatusLabel('done', t)).toBe('ENTREGADO');
  });

  // Un pedido a domicilio pagado no está "listo para retiro": nadie lo recoge.
  it('says a paid home order is being prepared for shipment, not ready for pickup', () => {
    expect(orderStatusLabel('ready', t, 'home')).toBe('PREPARANDO ENVÍO');
  });
});
