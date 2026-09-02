'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useCartStore, selectSubtotal } from '../../lib/stores/cart.store';
import { formatPrice } from '../../lib/pricing';
import type { Lang, Translations } from '@mucho-loco/types';

interface CartStepProps {
  t: Translations;
  lang: Lang;
  delivery: 'pickup' | 'home';
  setDelivery: (d: 'pickup' | 'home') => void;
  onContinue: () => void;
}

export function CartStep({ t, lang, delivery, setDelivery, onContinue }: CartStepProps) {
  const cart = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const subtotal = useCartStore(selectSubtotal);
  const shipping = delivery === 'home' ? 99 : 0;
  const total = subtotal + shipping;

  return (
    <div className="ck-grid">
      <div>
        <h1 className="font-display text-[clamp(40px,5vw,60px)] mb-2">{t.checkout.cart.title}</h1>
        {cart.length === 0 ? (
          <div className="text-ml-cream-dim py-10 text-center">
            <p className="text-lg mb-4">{t.checkout.cart.empty}</p>
            <Link href="/" className="btn-primary inline-block">{t.checkout.cart.goToShop}</Link>
          </div>
        ) : (
          <>
            <p className="text-ml-cream-dim mb-7">{cart.length} {cart.length !== 1 ? t.checkout.cart.itemCountPlural : t.checkout.cart.itemCountSingular} · {t.checkout.cart.reviewNote}</p>
            <div className="ck-card">
              {cart.map((item) => (
                <div key={item.id} className="cart-row">
                  <Image src={item.img} alt={item.name[lang]} width={64} height={64} />
                  <div className="info">
                    <b>{item.name[lang]}</b>
                    <small>{item.flav[lang]}</small>
                  </div>
                  <div className="qty">
                    <button onClick={() => updateQty(item.id, -1)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)}>+</button>
                  </div>
                  <div className="price">{formatPrice(item.price * item.qty)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {cart.length > 0 && (
        <div className="summary">
          <div className="ck-card">
            <div className="font-display text-xl mb-4">{t.checkout.cart.summary}</div>
            <div className="row"><span>{t.checkout.cart.subtotal}</span><span>{formatPrice(subtotal)}</span></div>
            <div className="mt-3.5">
              <div className="font-mono text-11 text-ml-cream-dim mb-2 uppercase tracking-wide">{t.checkout.cart.deliveryLabel}</div>
              <div className="pickup-options">
                <div className={'pickup-opt' + (delivery === 'pickup' ? ' active' : '')} onClick={() => setDelivery('pickup')}>
                  <div className="lbl">{t.checkout.cart.pickupOption}</div>
                  <div className="sub">{t.checkout.cart.pickupSub}</div>
                </div>
                <div className={'pickup-opt' + (delivery === 'home' ? ' active' : '')} onClick={() => setDelivery('home')}>
                  <div className="lbl">{t.checkout.cart.homeOption}</div>
                  <div className="sub">{t.checkout.cart.homeSub}</div>
                </div>
              </div>
            </div>
            {delivery === 'home' && <div className="row mt-2"><span>{t.checkout.cart.shippingLabel}</span><span>$99</span></div>}
            <div className="row total"><span>{t.checkout.cart.total}</span><span>{formatPrice(total)}</span></div>
            <button className="next-btn" onClick={onContinue}>{t.checkout.cart.continueToPayment} →</button>
          </div>
        </div>
      )}
    </div>
  );
}
