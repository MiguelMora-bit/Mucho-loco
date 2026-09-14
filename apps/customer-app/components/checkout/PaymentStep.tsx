'use client';

import type { SubmitEvent } from 'react';
import { useCartStore, selectSubtotal } from '../../lib/stores/cart.store';
import { formatPrice, HOME_SHIPPING_FEE } from '../../lib/pricing';
import { PAY_ICON, payLabels as buildPayLabels } from '../paymentMethodIcons';
import type { Lang, OnlinePaymentMethod, Translations } from '@mucho-loco/types';

interface PaymentStepProps {
  t: Translations;
  lang: Lang;
  delivery: 'pickup' | 'home';
  payMethod: OnlinePaymentMethod;
  setPayMethod: (m: OnlinePaymentMethod) => void;
  placing: boolean;
  error: string | null;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
}

export function PaymentStep({ t, lang, delivery, payMethod, setPayMethod, placing, error, onSubmit }: PaymentStepProps) {
  const cart = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectSubtotal);
  const shipping = delivery === 'home' ? HOME_SHIPPING_FEE : 0;
  const total = subtotal + shipping;

  const payLabels = buildPayLabels(t);
  const availableMethods = (Object.keys(payLabels) as OnlinePaymentMethod[]).filter(
    (key) => key !== 'cash' || delivery === 'pickup'
  );

  return (
    <div className="ck-grid">
      <form onSubmit={onSubmit}>
        <h1 className="font-display text-[clamp(36px,4vw,52px)] mb-6">{t.checkout.payment.title}</h1>

        {delivery === 'home' && (
          <div className="ck-card mb-4">
            <div className="font-display text-lg mb-3.5">{t.checkout.payment.shippingAddress}</div>
            <div className="field"><label>{t.checkout.payment.streetLabel}</label><input placeholder="Av. Insurgentes 123" required /></div>
            <div className="field-row">
              <div className="field"><label>{t.checkout.payment.cityLabel}</label><input placeholder="CDMX" required /></div>
              <div className="field"><label>{t.checkout.payment.zipLabel}</label><input placeholder="06600" required /></div>
            </div>
          </div>
        )}

        <div className="ck-card">
          <div className="font-display text-lg mb-3.5">{t.checkout.payment.paymentMethod}</div>
          <div className="pay-grid">
            {availableMethods.map((key) => (
              <div key={key} className={'pay-opt' + (payMethod === key ? ' active' : '')} onClick={() => setPayMethod(key)}>
                <span className="shrink-0 grid place-items-center text-ml-cream">{PAY_ICON[key]}</span>
                <span className="font-bebas tracking-[0.08em]">{payLabels[key]}</span>
              </div>
            ))}
          </div>
          {payMethod === 'card' && (
            <>
              <div className="field"><label>{t.checkout.payment.cardNumberLabel}</label><input placeholder="4242 4242 4242 4242" required /></div>
              <div className="field-row">
                <div className="field"><label>{t.checkout.payment.cardExpiryLabel}</label><input placeholder="12/27" required /></div>
                <div className="field"><label>{t.checkout.payment.cardCvcLabel}</label><input placeholder="123" required /></div>
              </div>
              <div className="field"><label>{t.checkout.payment.cardNameLabel}</label><input placeholder="DIEGO RAMÍREZ" required /></div>
            </>
          )}
          {payMethod === 'transfer' && (
            <div className="p-4 bg-[rgba(255,107,26,0.1)] border border-ml-orange text-center font-mono text-xs text-ml-orange">
              {t.checkout.payment.transferNote}
            </div>
          )}
          {(payMethod === 'mercadopago' || payMethod === 'stripe' || payMethod === 'paypal') && (
            <div className="p-4 bg-[rgba(255,107,26,0.1)] border border-ml-orange text-center font-mono text-xs text-ml-orange">
              {t.checkout.payment.redirectNote}
            </div>
          )}
          {payMethod === 'cash' && (
            <div className="p-4 bg-[rgba(255,182,39,0.1)] border border-ml-yellow text-center font-mono text-xs text-ml-yellow">
              {t.checkout.payment.cashNote}
            </div>
          )}
        </div>

        {error && <p className="text-ml-red text-xs font-mono mt-3">{error}</p>}

        <button className="next-btn" type="submit" disabled={placing}>
          {placing ? t.checkout.payment.processing : `🔥 ${t.checkout.payment.confirmOrder} · ${formatPrice(total)}`}
        </button>
      </form>
      <div className="summary">
        <div className="ck-card">
          <div className="font-display text-xl mb-3">{t.checkout.payment.yourOrder}</div>
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between py-2 border-b border-ml-border text-sm">
              <span>{item.name[lang]} × {item.qty}</span>
              <span>{formatPrice(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="row mt-2 pt-2"><span>{t.checkout.payment.subtotal}</span><span>{formatPrice(subtotal)}</span></div>
          {delivery === 'home' && <div className="row"><span>{t.checkout.payment.shippingLabel}</span><span>{formatPrice(HOME_SHIPPING_FEE)}</span></div>}
          <div className="row total"><span>{t.checkout.payment.total}</span><span>{formatPrice(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
