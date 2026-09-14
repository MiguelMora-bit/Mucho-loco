import type { OnlinePaymentMethod, Translations } from '@mucho-loco/types';

/** Nombre del método de pago, con las mismas claves que `payLabels` de la web. */
export function paymentLabel(method: OnlinePaymentMethod, t: Translations): string {
  const p = t.checkout.payment;
  switch (method) {
    case 'card':
    case 'stripe':
      return p.payCard;
    case 'transfer':
      return p.payTransfer;
    case 'cash':
      return p.payCash;
    case 'mercadopago':
      return p.payMercadopago;
    case 'paypal':
      return p.payPaypal;
  }
}
