import { describe, expect, it } from 'vitest';
import type { CartItem } from '@mucho-loco/types';
import { HOME_SHIPPING_FEE } from '@mucho-loco/customer-core/pricing';
import { checkoutTotals, orderLines, paymentMethodsFor, usesGateway } from './checkout';

const item: CartItem = {
  id: 'whey-fresa',
  cat: 'proteinas',
  name: { es: 'Whey', en: 'Whey' },
  flav: { es: 'Fresa', en: 'Strawberry' },
  price: 1290,
  img: '/assets/prod-whey-strawberry.jpg',
  qty: 2,
};

describe('paymentMethodsFor', () => {
  // Regla de negocio del CLAUDE.md raíz: efectivo solo si se recoge en gym.
  it('offers cash only for pickup', () => {
    expect(paymentMethodsFor('pickup')).toContain('cash');
    expect(paymentMethodsFor('home')).not.toContain('cash');
  });

  it('does not offer gateways the backend cannot charge yet', () => {
    for (const delivery of ['pickup', 'home'] as const) {
      expect(paymentMethodsFor(delivery)).not.toContain('mercadopago');
      expect(paymentMethodsFor(delivery)).not.toContain('paypal');
    }
  });
});

describe('usesGateway', () => {
  it('sends only card through Stripe', () => {
    expect(usesGateway('card')).toBe(true);
    expect(usesGateway('transfer')).toBe(false);
    expect(usesGateway('cash')).toBe(false);
  });
});

describe('orderLines', () => {
  // Misma regresión de seguridad que customer-app: el cliente nunca manda
  // precio ni total — los pone el servidor desde el catálogo.
  it('sends only productId and qty', () => {
    const [line] = orderLines([item]);
    expect(line).toEqual({ productId: 'whey-fresa', qty: 2 });
    expect(Object.keys(line).sort()).toEqual(['productId', 'qty']);
  });
});

describe('checkoutTotals', () => {
  it('has no shipping for pickup', () => {
    expect(checkoutTotals([item], 'pickup')).toEqual({ subtotal: 2580, shipping: 0, total: 2580 });
  });

  it('adds the home shipping fee', () => {
    expect(checkoutTotals([item], 'home')).toEqual({
      subtotal: 2580,
      shipping: HOME_SHIPPING_FEE,
      total: 2580 + HOME_SHIPPING_FEE,
    });
  });
});
