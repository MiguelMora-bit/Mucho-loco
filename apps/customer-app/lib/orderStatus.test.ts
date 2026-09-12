import { describe, it, expect } from 'vitest';
import { orderStatusLabel } from './orderStatus';
import type { Translations } from '@mucho-loco/types';

const t = {
  dashboard: {
    orders: {
      ready: 'LISTO PARA RETIRO',
      pendingPayment: 'PENDIENTE DE PAGO',
      delivered: 'ENTREGADO',
    },
  },
} as Translations;

describe('orderStatusLabel', () => {
  it('maps each OrderStatus to its translated label', () => {
    expect(orderStatusLabel('pending_payment', t)).toBe('PENDIENTE DE PAGO');
    expect(orderStatusLabel('ready', t)).toBe('LISTO PARA RETIRO');
    expect(orderStatusLabel('done', t)).toBe('ENTREGADO');
  });
});
