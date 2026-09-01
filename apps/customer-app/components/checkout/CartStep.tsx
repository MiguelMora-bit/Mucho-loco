'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useCartStore, selectSubtotal } from '../../lib/stores/cart.store';
import { formatPrice } from '../../lib/pricing';

interface CartStepProps {
  delivery: 'pickup' | 'home';
  setDelivery: (d: 'pickup' | 'home') => void;
  onContinue: () => void;
}

export function CartStep({ delivery, setDelivery, onContinue }: CartStepProps) {
  const cart = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const subtotal = useCartStore(selectSubtotal);
  const shipping = delivery === 'home' ? 99 : 0;
  const total = subtotal + shipping;

  return (
    <div className="ck-grid">
      <div>
        <h1 className="font-display text-[clamp(40px,5vw,60px)] mb-2">TU BOLSA LOCA</h1>
        {cart.length === 0 ? (
          <div className="text-ml-cream-dim py-10 text-center">
            <p className="text-lg mb-4">Tu carrito está vacío.</p>
            <Link href="/" className="btn-primary inline-block">IR A LA TIENDA</Link>
          </div>
        ) : (
          <>
            <p className="text-ml-cream-dim mb-7">{cart.length} producto{cart.length !== 1 ? 's' : ''} · Revisa antes de pagar</p>
            <div className="ck-card">
              {cart.map((item) => (
                <div key={item.id} className="cart-row">
                  <Image src={item.img} alt={item.name} width={64} height={64} />
                  <div className="info">
                    <b>{item.name}</b>
                    <small>{item.flav}</small>
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
            <div className="font-display text-xl mb-4">RESUMEN</div>
            <div className="row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="mt-[14px]">
              <div className="font-mono text-[11px] text-ml-cream-dim mb-2 uppercase tracking-wide">Entrega</div>
              <div className="pickup-options">
                <div className={'pickup-opt' + (delivery === 'pickup' ? ' active' : '')} onClick={() => setDelivery('pickup')}>
                  <div className="lbl">🏪 SUCURSAL</div>
                  <div className="sub">Gratis · 24-48h</div>
                </div>
                <div className={'pickup-opt' + (delivery === 'home' ? ' active' : '')} onClick={() => setDelivery('home')}>
                  <div className="lbl">📦 A DOMICILIO</div>
                  <div className="sub">$99 · 2-3 días</div>
                </div>
              </div>
            </div>
            {delivery === 'home' && <div className="row mt-2"><span>Envío</span><span>$99</span></div>}
            <div className="row total"><span>TOTAL</span><span>{formatPrice(total)}</span></div>
            <button className="next-btn" onClick={onContinue}>CONTINUAR AL PAGO →</button>
          </div>
        </div>
      )}
    </div>
  );
}
