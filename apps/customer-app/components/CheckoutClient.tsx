'use client';

import { Suspense, useState } from 'react';
import type { SubmitEvent } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
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

/**
 * Métodos que se cobran fuera del sitio, en una pasarela. El resto
 * (transferencia, efectivo al recoger) deja el pedido pendiente y se cobra por
 * otro canal, así que no pasa por aquí.
 *
 * 'card' y 'stripe' son el mismo camino: Stripe decide qué métodos mostrarle a
 * cada socio (métodos de pago dinámicos), así que "tarjeta" no es una
 * pasarela distinta — es lo que ese checkout va a ofrecer casi siempre.
 */
const GATEWAY_METHODS: OnlinePaymentMethod[] = ['card', 'stripe'];

/**
 * `useSearchParams` obliga a un límite de Suspense (requisito del App Router).
 * Se necesita porque el regreso desde la pasarela llega como `?paid=1` — el
 * socio vuelve a ESTA misma página, no a una distinta.
 */
export default function CheckoutClient() {
  return (
    <Suspense fallback={<div className="bg-ml-black min-h-screen" />}>
      <CheckoutFlow />
    </Suspense>
  );
}

function CheckoutFlow() {
  useSessionRefresh();
  const t = useT();
  const lang = useLocale() as Lang;
  const cart = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const _hydrated = useCartStore((s) => s._hydrated);
  // Volver de la pasarela cae directo en la confirmación. Ojo: esto NO
  // significa "pagado" — el pedido solo pasa a pagado cuando el backend recibe
  // el webhook. La pantalla dice que el pedido se registró, y su estado real
  // se ve en el panel del socio.
  const paidReturn = useSearchParams().get('paid') === '1';
  const [step, setStep] = useState(paidReturn ? 2 : 0);
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

    // Con pasarela el flujo se parte en dos: aquí solo se abre la sesión de
    // cobro y el socio se va a pagar fuera del sitio. El pedido queda
    // pendiente y lo confirma el webhook, no el regreso del usuario — puede
    // pagar y cerrar la pestaña.
    if (GATEWAY_METHODS.includes(payMethod)) {
      await run(async () => {
        const origin = window.location.origin;
        const { url } = await postJson<{ orderId: string; url: string }>('/api/checkout', {
          items,
          delivery,
          lang,
          successUrl: `${origin}/${lang}/checkout?paid=1`,
          cancelUrl: `${origin}/${lang}/checkout`,
        });
        clear();
        window.location.href = url;
      });
      return;
    }

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
