'use client';

import type { SubmitEvent } from 'react';
import { useCartStore, selectSubtotal } from '../../lib/stores/cart.store';
import { formatPrice } from '../../lib/pricing';

type PayMethod = 'card' | 'oxxo' | 'transfer' | 'crypto';

interface PaymentStepProps {
  delivery: 'pickup' | 'home';
  payMethod: PayMethod;
  setPayMethod: (m: PayMethod) => void;
  placing: boolean;
  error: string | null;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
}

const PAY_LABELS: Record<PayMethod, string> = {
  card: '💳 TARJETA',
  oxxo: '🏪 OXXO PAY',
  transfer: '🏦 TRANSFERENCIA',
  crypto: '₿ CRYPTO',
};

export function PaymentStep({ delivery, payMethod, setPayMethod, placing, error, onSubmit }: PaymentStepProps) {
  const cart = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectSubtotal);
  const shipping = delivery === 'home' ? 99 : 0;
  const total = subtotal + shipping;

  return (
    <div className="ck-grid">
      <form onSubmit={onSubmit}>
        <h1 className="font-display text-[clamp(36px,4vw,52px)] mb-6">DATOS DE PAGO</h1>

        {delivery === 'home' && (
          <div className="ck-card mb-4">
            <div className="font-display text-lg mb-3.5">DIRECCIÓN DE ENVÍO</div>
            <div className="field"><label>Calle y número</label><input placeholder="Av. Insurgentes 123" required /></div>
            <div className="field-row">
              <div className="field"><label>Ciudad</label><input placeholder="CDMX" required /></div>
              <div className="field"><label>C.P.</label><input placeholder="06600" required /></div>
            </div>
          </div>
        )}

        <div className="ck-card">
          <div className="font-display text-lg mb-3.5">MÉTODO DE PAGO</div>
          <div className="pay-grid">
            {(Object.keys(PAY_LABELS) as PayMethod[]).map((key) => (
              <div key={key} className={'pay-opt' + (payMethod === key ? ' active' : '')} onClick={() => setPayMethod(key)}>
                <span className="font-bebas tracking-[0.08em]">{PAY_LABELS[key]}</span>
              </div>
            ))}
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

        {error && <p className="text-ml-red text-xs font-mono mt-3">{error}</p>}

        <button className="next-btn" type="submit" disabled={placing}>
          {placing ? 'PROCESANDO...' : `🔥 CONFIRMAR PEDIDO · ${formatPrice(total)}`}
        </button>
      </form>
      <div className="summary">
        <div className="ck-card">
          <div className="font-display text-xl mb-3">TU PEDIDO</div>
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between py-2 border-b border-ml-border text-sm">
              <span>{item.name} × {item.qty}</span>
              <span>{formatPrice(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="row mt-2 pt-2"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          {delivery === 'home' && <div className="row"><span>Envío</span><span>$99</span></div>}
          <div className="row total"><span>TOTAL</span><span>{formatPrice(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
