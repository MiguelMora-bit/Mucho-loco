'use client';

import { useState } from 'react';
import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';
import { useCartStore, selectSubtotal } from '@/lib/stores/cart.store';

const STEPS = ['Carrito', 'Pago', 'Confirmación'];

export default function CheckoutPage() {
  const { items: cart, updateQty, clear } = useCartStore();
  const subtotal = useCartStore(selectSubtotal);
  const [step, setStep] = useState(0);
  const [delivery, setDelivery] = useState<'pickup' | 'home'>('pickup');
  const [payMethod, setPayMethod] = useState<'card' | 'oxxo' | 'transfer' | 'crypto'>('card');
  const [placing, setPlacing] = useState(false);

  const shipping = delivery === 'home' ? 99 : 0;
  const total = subtotal + shipping;

  async function placeOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 1200));
    clear();
    setStep(2);
    setPlacing(false);
  }

  return (
    <div className="bg-ml-black min-h-screen pb-20">
      <nav className="ck-nav">
        <Link className="brand" href="/">
          <img src="/assets/bull-head.png" alt="" />
          <div className="name">MUCHO <span>LOCO</span></div>
        </Link>
        <Link href="/" className="back">← Seguir comprando</Link>
      </nav>

      <div className="ck-wrap">
        <div className="stepper">
          {STEPS.map((s, i) => (
            <>
              <div key={s} className={'step' + (step === i ? ' active' : '') + (step > i ? ' done' : '')}>
                <div className="num">{step > i ? '✓' : i + 1}</div>
                <span className="lbl">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div key={`line-${i}`} className={'step-line' + (step > i ? ' done' : '')} />}
            </>
          ))}
        </div>

        {step === 0 && (
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
                        <img src={item.img} alt={item.name} />
                        <div className="info">
                          <b>{item.name}</b>
                          <small>{item.flav}</small>
                        </div>
                        <div className="qty">
                          <button onClick={() => updateQty(item.id, -1)}>−</button>
                          <span>{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)}>+</button>
                        </div>
                        <div className="price">${(item.price * item.qty).toLocaleString()}</div>
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
                  <div className="row"><span>Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
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
                  <div className="row total"><span>TOTAL</span><span>${total.toLocaleString()}</span></div>
                  <button className="next-btn" onClick={() => setStep(1)}>CONTINUAR AL PAGO →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="ck-grid">
            <form onSubmit={placeOrder}>
              <h1 className="font-display text-[clamp(36px,4vw,52px)] mb-6">DATOS DE PAGO</h1>

              {delivery === 'home' && (
                <div className="ck-card mb-4">
                  <div className="font-display text-lg mb-[14px]">DIRECCIÓN DE ENVÍO</div>
                  <div className="field"><label>Calle y número</label><input placeholder="Av. Insurgentes 123" required /></div>
                  <div className="field-row">
                    <div className="field"><label>Ciudad</label><input placeholder="CDMX" required /></div>
                    <div className="field"><label>C.P.</label><input placeholder="06600" required /></div>
                  </div>
                </div>
              )}

              <div className="ck-card">
                <div className="font-display text-lg mb-[14px]">MÉTODO DE PAGO</div>
                <div className="pay-grid">
                  {(['card', 'oxxo', 'transfer', 'crypto'] as const).map((key) => {
                    const labels = { card: '💳 TARJETA', oxxo: '🏪 OXXO PAY', transfer: '🏦 TRANSFERENCIA', crypto: '₿ CRYPTO' };
                    return (
                      <div key={key} className={'pay-opt' + (payMethod === key ? ' active' : '')} onClick={() => setPayMethod(key)}>
                        <span className="font-bebas tracking-[0.08em]">{labels[key]}</span>
                      </div>
                    );
                  })}
                </div>
                {payMethod === 'card' && (
                  <>
                    <div className="field"><label>Número de tarjeta</label><input placeholder="4242 4242 4242 4242" required /></div>
                    <div className="field-row">
                      <div className="field"><label>Vencimiento</label><input placeholder="12/27" required /></div>
                      <div className="field"><label>CVC</label><input placeholder="123" required /></div>
                    </div>
                    <div className="field"><label>Nombre en tarjeta</label><input placeholder="DIEGO RAMÍREZ" required /></div>
                  </>
                )}
                {payMethod === 'oxxo' && (
                  <div className="p-4 bg-[rgba(255,182,39,0.1)] border border-ml-yellow text-center font-mono text-xs text-ml-yellow">
                    Al confirmar recibirás una referencia OXXO Pay por email. Tienes 48h para pagar.
                  </div>
                )}
                {(payMethod === 'transfer' || payMethod === 'crypto') && (
                  <div className="p-4 bg-[rgba(255,107,26,0.1)] border border-ml-orange text-center font-mono text-xs text-ml-orange">
                    Las instrucciones llegarán a tu correo después de confirmar.
                  </div>
                )}
              </div>

              <button className="next-btn" type="submit" disabled={placing}>
                {placing ? 'PROCESANDO...' : `🔥 CONFIRMAR PEDIDO · $${total.toLocaleString()}`}
              </button>
            </form>
            <div className="summary">
              <div className="ck-card">
                <div className="font-display text-xl mb-3">TU PEDIDO</div>
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between py-2 border-b border-ml-border text-sm">
                    <span>{item.name} × {item.qty}</span>
                    <span>${(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
                <div className="row mt-2 pt-2"><span>Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
                {delivery === 'home' && <div className="row"><span>Envío</span><span>$99</span></div>}
                <div className="row total"><span>TOTAL</span><span>${total.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="confirm-screen">
            <div className="text-[80px] mb-6">🔥</div>
            <h1 className="font-display text-[clamp(48px,6vw,80px)] leading-[0.95] mb-4">
              ¡PEDIDO<br /><span className="text-ml-red">CONFIRMADO!</span>
            </h1>
            <p className="text-ml-cream-dim text-base max-w-[480px] mx-auto mb-8">
              Tu confirmación llegará por email. {delivery === 'pickup' ? 'Listo para retiro en 24–48h.' : 'Envío en 2–3 días hábiles.'}
            </p>
            <div className="flex gap-[14px] justify-center flex-wrap">
              <Link href="/dashboard" className="btn-primary inline-block no-underline px-8 py-4 font-display text-xl tracking-[0.06em] bg-ml-red text-white">VER MI CUENTA</Link>
              <Link href="/" className="inline-block no-underline px-8 py-4 font-display text-xl tracking-[0.06em] border border-ml-border text-ml-cream">SEGUIR COMPRANDO</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
