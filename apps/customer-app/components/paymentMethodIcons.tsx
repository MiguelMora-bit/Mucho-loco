import type { ReactNode } from 'react';
import { LuLandmark, LuBanknote } from 'react-icons/lu';
import { SiStripe, SiPaypal, SiMercadopago, SiVisa, SiMastercard } from 'react-icons/si';
import type { OnlinePaymentMethod, Translations } from '@mucho-loco/types';

export const PAY_ICON: Record<OnlinePaymentMethod, ReactNode> = {
  card: (
    <span className="flex items-center gap-1.5">
      <SiVisa size={22} color="#1A1F71" />
      <SiMastercard size={22} color="#EB001B" />
    </span>
  ),
  transfer: <LuLandmark size={22} />,
  mercadopago: <SiMercadopago size={22} color="#00B1EA" />,
  stripe: <SiStripe size={22} color="#635BFF" />,
  paypal: <SiPaypal size={22} color="#003087" />,
  cash: <LuBanknote size={22} />,
};

export function payLabels(t: Translations): Record<OnlinePaymentMethod, string> {
  return {
    card: t.checkout.payment.payCard,
    transfer: t.checkout.payment.payTransfer,
    mercadopago: t.checkout.payment.payMercadopago,
    stripe: t.checkout.payment.payStripe,
    paypal: t.checkout.payment.payPaypal,
    cash: t.checkout.payment.payCash,
  };
}
