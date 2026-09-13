import type { CartItem, NewOrderLine, OnlinePaymentMethod } from '@mucho-loco/types';
import { HOME_SHIPPING_FEE } from '@mucho-loco/customer-core/pricing';
import { cartSubtotal } from './cart';

export type Delivery = 'pickup' | 'home';

/**
 * Lo que ofrece el móvil. La web muestra además Mercado Pago y PayPal, pero
 * el backend todavía no los cobra (ver punto 6 de "Metodología" en el
 * CLAUDE.md raíz): aquí no se promete lo que no existe.
 */
const PAYMENT_METHODS: OnlinePaymentMethod[] = ['card', 'transfer', 'cash'];

/** Efectivo solo al recoger en gym — regla de negocio del CLAUDE.md raíz. */
export function paymentMethodsFor(delivery: Delivery): OnlinePaymentMethod[] {
  return PAYMENT_METHODS.filter((m) => m !== 'cash' || delivery === 'pickup');
}

/**
 * Mismo criterio que `GATEWAY_METHODS` en `CheckoutClient` de la web: con
 * tarjeta se abre una sesión de Stripe y el socio paga fuera de la app; el
 * resto crea el pedido pendiente directo y se cobra por otro canal.
 */
export function usesGateway(method: OnlinePaymentMethod): boolean {
  return method === 'card';
}

/** Solo id + cantidad: precio y total los pone el servidor (ver IUserRepository.createOrder). */
export function orderLines(items: CartItem[]): NewOrderLine[] {
  return items.map(({ id, qty }) => ({ productId: id, qty }));
}

/**
 * Vista previa del total. El que se cobra lo calcula el backend; este solo
 * sirve para que el socio vea la misma cifra antes de confirmar.
 */
export function checkoutTotals(items: CartItem[], delivery: Delivery) {
  const subtotal = cartSubtotal(items);
  const shipping = delivery === 'home' ? HOME_SHIPPING_FEE : 0;
  return { subtotal, shipping, total: subtotal + shipping };
}
