'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useCartStore, selectSubtotal } from '../../lib/stores/cart.store';
import { formatPrice } from '../../lib/pricing';
import type { Lang, Translations } from '@mucho-loco/types';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  t: Translations;
  lang: Lang;
}

export function CartDrawer({ open, onClose, t, lang }: CartDrawerProps) {
  const cart = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const subtotal = useCartStore(selectSubtotal);

  return (
    <>
      <div className={'cart-backdrop' + (open ? ' open' : '')} onClick={onClose}></div>
      <aside className={'cart-drawer' + (open ? ' open' : '')}>
        <div className="cart-header">
          <h3>🔥 {t.cart.title}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="cart-items">
          {cart.length === 0 && <div className="cart-empty">{t.cart.empty}</div>}
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="ci-img relative">
                <Image src={item.img} alt="" fill sizes="60px" className="object-cover" />
              </div>
              <div>
                <div className="ci-name">{item.name[lang]}</div>
                <div className="ci-flav">{item.flav[lang]}</div>
                <div className="ci-price">{formatPrice(item.price)}</div>
              </div>
              <div className="qty">
                <button onClick={() => updateQty(item.id, -1)}>−</button>
                <span>{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-subtotal">
              <span>{t.cart.subtotal}</span>
              <span className="amount">{formatPrice(subtotal)}</span>
            </div>
            <Link href="/checkout" className="cart-checkout block text-center no-underline">
              {t.cart.checkout} →
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
