'use client';

import { useState } from 'react';
import type { SubmitEvent } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useCartStore } from '../lib/stores/cart.store';
import { postJson } from '../lib/api-client';
import { useAsyncSubmit } from '../lib/hooks/useAsyncSubmit';
import { useSessionRefresh } from '../lib/hooks/useSessionRefresh';
import { useT } from '../lib/hooks/useT';
import { Stepper, CartStep, PaymentStep, ConfirmationStep } from './checkout';
import type { Lang, Order, NewOrderLine, OnlinePaymentMethod } from '@mucho-loco/types';

type Delivery = 'pickup' | 'home';

export default function CheckoutClient() {
  useSessionRefresh();
  const t = useT();
  const lang = useLocale() as Lang;
  const cart = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const _hydrated = useCartStore((s) => s._hydrated);
  const [step, setStep] = useState(0);
  const [delivery, setDelivery] = useState<Delivery>('pickup');
  const [payMethod, setPayMethod] = useState<OnlinePaymentMethod>('card');
  const { loading: placing, error, run } = useAsyncSubmit({
    errorMessage: t.checkout.errorPlacingOrder,
    connectionErrorMessage: t.common.connectionError,
  });

  async function placeOrder(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    // Solo id + cantidad: precio, nombre, sabor, imagen y total los resuelve
    // el servidor desde el catálogo (ver IUserRepository.createOrder).
    const items: NewOrderLine[] = cart.map(({ id, qty }) => ({ productId: id, qty }));
    await run(async () => {
      await postJson<Order>('/api/orders', { items, paymentMethod: payMethod, delivery, lang });
      clear();
      setStep(2);
    });
  }

  if (!_hydrated) {
    return <div className="bg-ml-black min-h-screen" />;
  }

  return (
    <div className="bg-ml-black min-h-screen pb-20">
      <nav className="ck-nav">
        <Link className="brand" href="/">
          <Image src="/assets/bull-head.png" alt="" width={44} height={44} />
          <div className="name">MUCHO <span>LOCO</span></div>
        </Link>
        <Link href="/" className="back">← {t.checkout.backToShop}</Link>
      </nav>

      <div className="ck-wrap">
        <Stepper steps={t.checkout.steps} current={step} />

        {step === 0 && <CartStep t={t} lang={lang} delivery={delivery} setDelivery={setDelivery} onContinue={() => setStep(1)} />}
        {step === 1 && (
          <PaymentStep
            t={t}
            lang={lang}
            delivery={delivery}
            payMethod={payMethod}
            setPayMethod={setPayMethod}
            placing={placing}
            error={error}
            onSubmit={placeOrder}
          />
        )}
        {step === 2 && <ConfirmationStep t={t} delivery={delivery} />}
      </div>
    </div>
  );
}
