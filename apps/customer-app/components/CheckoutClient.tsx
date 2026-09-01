'use client';

import { useState } from 'react';
import type { SubmitEvent } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useCartStore } from '../lib/stores/cart.store';
import { postJson } from '../lib/api-client';
import { useAsyncSubmit } from '../lib/hooks/useAsyncSubmit';
import { Stepper, CartStep, PaymentStep, ConfirmationStep } from './checkout';
import type { Order, OrderItem } from '@mucho-loco/types';

const STEPS = ['Carrito', 'Pago', 'Confirmación'];

type Delivery = 'pickup' | 'home';
type PayMethod = 'card' | 'oxxo' | 'transfer' | 'crypto';

export default function CheckoutClient() {
  const cart = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const _hydrated = useCartStore((s) => s._hydrated);
  const [step, setStep] = useState(0);
  const [delivery, setDelivery] = useState<Delivery>('pickup');
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const { loading: placing, error, run } = useAsyncSubmit({ errorMessage: 'No pudimos procesar tu pedido. Intenta de nuevo.' });

  async function placeOrder(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const shipping = delivery === 'home' ? 99 : 0;
    const total = cart.reduce((n, i) => n + i.price * i.qty, 0) + shipping;
    const items: OrderItem[] = cart.map(({ name, flav, img, qty }) => ({ name, flav, img, qty }));
    await run(async () => {
      await postJson<Order>('/api/orders', { items, total });
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
        <Link href="/" className="back">← Seguir comprando</Link>
      </nav>

      <div className="ck-wrap">
        <Stepper steps={STEPS} current={step} />

        {step === 0 && <CartStep delivery={delivery} setDelivery={setDelivery} onContinue={() => setStep(1)} />}
        {step === 1 && (
          <PaymentStep
            delivery={delivery}
            payMethod={payMethod}
            setPayMethod={setPayMethod}
            placing={placing}
            error={error}
            onSubmit={placeOrder}
          />
        )}
        {step === 2 && <ConfirmationStep delivery={delivery} />}
      </div>
    </div>
  );
}
