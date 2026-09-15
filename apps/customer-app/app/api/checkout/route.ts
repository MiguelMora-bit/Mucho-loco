import { NextResponse } from 'next/server';
import { paymentRepository } from '../../../lib/repositories/payment.repository';
import { getCurrentUserEmail } from '../../../lib/session';
import { orderErrorStatus } from '../../../lib/order-errors';
import type { NewOrderLine, Lang, OrderDelivery } from '@mucho-loco/types';

// Server-side por la misma razón que POST /api/orders: la cookie httpOnly
// ml_session que autentica contra el backend solo se puede leer aquí. Además,
// el importe a cobrar lo arma el servidor — el browser nunca lo toca.
export async function POST(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { items, delivery, lang, successUrl, cancelUrl } = (await request.json()) as {
    items: NewOrderLine[];
    delivery: OrderDelivery;
    lang: Lang;
    successUrl: string;
    cancelUrl: string;
  };
  // El body viene del browser: forma inválida = pedido inválido, no un 500.
  if (delivery?.method !== 'pickup' && delivery?.method !== 'home') {
    return NextResponse.json({ error: 'INVALID_ORDER' }, { status: 400 });
  }

  try {
    const session = await paymentRepository.createCheckoutSession(
      email,
      items,
      delivery,
      lang,
      successUrl,
      cancelUrl,
    );
    return NextResponse.json(session);
  } catch (e) {
    const status = orderErrorStatus(e);
    if (status === null) throw e;
    return NextResponse.json({ error: 'INVALID_ORDER' }, { status });
  }
}
