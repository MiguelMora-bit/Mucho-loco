'use client';

import type { InputHTMLAttributes, SubmitEvent } from 'react';
import { useCartStore, selectSubtotal } from '../../lib/stores/cart.store';
import { formatPrice, HOME_SHIPPING_FEE } from '../../lib/pricing';
import { PAY_ICON, payLabels as buildPayLabels } from '../paymentMethodIcons';
import type { ShippingAddressField } from '@mucho-loco/customer-core/shipping';
import type { Lang, OfflinePaymentMethod, ShippingAddress, Translations } from '@mucho-loco/types';

/**
 * Lo que se puede elegir: tarjeta = Stripe (que en su página también ofrece
 * OXXO y SPEI), o efectivo al recoger. Transferencia, Mercado Pago y PayPal ya
 * no: creaban el pedido como pagado sin cobrar nada.
 */
export type CheckoutPayMethod = 'card' | OfflinePaymentMethod;

interface PaymentStepProps {
  t: Translations;
  lang: Lang;
  delivery: 'pickup' | 'home';
  address: ShippingAddress;
  onAddressChange: (field: ShippingAddressField, value: string) => void;
  /** Campos que no pasaron `parseShippingAddress` al intentar confirmar. */
  invalidFields: ShippingAddressField[];
  payMethod: CheckoutPayMethod;
  setPayMethod: (m: CheckoutPayMethod) => void;
  placing: boolean;
  error: string | null;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
}

export function PaymentStep({
  t,
  lang,
  delivery,
  address,
  onAddressChange,
  invalidFields,
  payMethod,
  setPayMethod,
  placing,
  error,
  onSubmit,
}: PaymentStepProps) {
  const cart = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectSubtotal);
  const shipping = delivery === 'home' ? HOME_SHIPPING_FEE : 0;
  const total = subtotal + shipping;
  const p = t.checkout.payment;

  const payLabels = buildPayLabels(t);
  // Efectivo solo al recoger (ver CLAUDE.md raíz, "Pagos en línea").
  const availableMethods: CheckoutPayMethod[] = delivery === 'pickup' ? ['card', 'cash'] : ['card'];

  // Inputs controlados: antes eran sueltos y lo que el socio escribía nunca
  // salía del formulario — el pedido a domicilio se creaba sin dirección.
  const addressField = (
    field: ShippingAddressField,
    label: string,
    placeholder: string,
    extra: InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className="field">
      <label htmlFor={`ship-${field}`}>{label}</label>
      <input
        id={`ship-${field}`}
        name={field}
        placeholder={placeholder}
        required
        value={address[field] ?? ''}
        onChange={(e) => onAddressChange(field, e.target.value)}
        aria-invalid={invalidFields.includes(field)}
        {...extra}
      />
    </div>
  );

  return (
    <div className="ck-grid">
      <form onSubmit={onSubmit}>
        <h1 className="font-display text-[clamp(36px,4vw,52px)] mb-6">{p.title}</h1>

        {delivery === 'home' && (
          <div className="ck-card mb-4">
            <div className="font-display text-lg mb-3.5">{p.shippingAddress}</div>
            {addressField('street', p.streetLabel, 'Av. Insurgentes Sur 1234, int. 5', { autoComplete: 'address-line1' })}
            {addressField('neighborhood', p.neighborhoodLabel, 'Roma Sur', { autoComplete: 'address-level3' })}
            <div className="field-row">
              {addressField('city', p.cityLabel, 'Cuauhtémoc', { autoComplete: 'address-level2' })}
              {addressField('state', p.stateLabel, 'CDMX', { autoComplete: 'address-level1' })}
            </div>
            <div className="field-row">
              {addressField('postalCode', p.zipLabel, '06760', {
                autoComplete: 'postal-code',
                inputMode: 'numeric',
                maxLength: 5,
                pattern: '\\d{5}',
              })}
              {addressField('phone', p.phoneLabel, '55 1234 5678', { autoComplete: 'tel', inputMode: 'tel', type: 'tel' })}
            </div>
            {addressField('references', p.referencesLabel, 'Entre Medellín y Monterrey, portón negro', { required: false })}
            {invalidFields.length > 0 && <p role="alert" className="text-ml-red text-xs font-mono mt-1">{p.addressInvalid}</p>}
          </div>
        )}

        <div className="ck-card">
          <div className="font-display text-lg mb-3.5">{p.paymentMethod}</div>
          <div className="pay-grid">
            {availableMethods.map((key) => (
              <div key={key} className={'pay-opt' + (payMethod === key ? ' active' : '')} onClick={() => setPayMethod(key)}>
                <span className="shrink-0 grid place-items-center text-ml-cream">{PAY_ICON[key]}</span>
                <span className="font-bebas tracking-[0.08em]">{payLabels[key]}</span>
              </div>
            ))}
          </div>
          {/* Nunca pedimos datos de tarjeta aquí: Stripe cobra en su propia página.
              Antes había campos de tarjeta que no se usaban para nada. */}
          {payMethod === 'card' && (
            <div className="p-4 bg-[rgba(255,107,26,0.1)] border border-ml-orange text-center font-mono text-xs text-ml-orange">
              {p.redirectNote}
            </div>
          )}
          {payMethod === 'cash' && (
            <div className="p-4 bg-[rgba(255,182,39,0.1)] border border-ml-yellow text-center font-mono text-xs text-ml-yellow">
              {p.cashNote}
            </div>
          )}
        </div>

        {error && <p className="text-ml-red text-xs font-mono mt-3">{error}</p>}

        <button className="next-btn" type="submit" disabled={placing}>
          {placing ? p.processing : `🔥 ${p.confirmOrder} · ${formatPrice(total)}`}
        </button>
      </form>
      <div className="summary">
        <div className="ck-card">
          <div className="font-display text-xl mb-3">{p.yourOrder}</div>
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between py-2 border-b border-ml-border text-sm">
              <span>{item.name[lang]} × {item.qty}</span>
              <span>{formatPrice(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="row mt-2 pt-2"><span>{p.subtotal}</span><span>{formatPrice(subtotal)}</span></div>
          {delivery === 'home' && <div className="row"><span>{p.shippingLabel}</span><span>{formatPrice(HOME_SHIPPING_FEE)}</span></div>}
          <div className="row total"><span>{p.total}</span><span>{formatPrice(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
