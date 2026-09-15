import { NextResponse } from 'next/server';
import { userRepository } from '../../../lib/repositories/user.repository';
import { getCurrentUserEmail } from '../../../lib/session';
import { orderErrorStatus } from '../../../lib/order-errors';
import type { NewOrderLine, Lang, OrderDelivery } from '@mucho-loco/types';

// Runs server-side so the order lands in the same userRepository instance the
// dashboard reads from on its next server-rendered request. Calling
// userRepository.createOrder() straight from the checkout client component
// would mutate a separate, browser-only copy of the mock data that the
// server (and therefore the dashboard) would never see. Con el datasource
// HTTP el motivo es otro pero apunta al mismo lado: la cookie httpOnly
// ml_session que autentica contra el backend solo se puede leer aquí.
export async function POST(request: Request) {
  // El middleware de páginas no cubre /api/* (ver matcher en middleware.ts) —
  // esta es la única capa que protege esta ruta, así que rechazamos sin
  // sesión válida en vez de crear el pedido bajo un email vacío/anónimo.
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // Nunca se recibe `total`: lo calcula el repositorio desde el catálogo. Un
  // cliente que mande un total inventado no cambia nada — no se lee.
  const { items, paymentMethod, delivery, lang } = (await request.json()) as {
    items: NewOrderLine[];
    paymentMethod: string;
    delivery: OrderDelivery;
    lang: Lang;
  };
  // El body viene del browser: forma inválida = pedido inválido, no un 500.
  // Sin pasarela solo hay efectivo; lo demás se cobra en /api/checkout
  // (Stripe). Antes 'card', 'transfer', 'paypal'... creaban el pedido como
  // pagado sin cobrar nada.
  if (paymentMethod !== 'cash' || (delivery?.method !== 'pickup' && delivery?.method !== 'home')) {
    return NextResponse.json({ error: 'INVALID_ORDER' }, { status: 400 });
  }

  try {
    const order = await userRepository.createOrder(email, items, 'cash', delivery, lang);
    return NextResponse.json(order);
  } catch (e) {
    // Mock y backend rechazan lo mismo (efectivo a domicilio, producto
    // inexistente) con errores de forma distinta — orderErrorStatus los
    // normaliza para que el checkout vea el mismo status en los dos modos.
    const status = orderErrorStatus(e);
    if (status === null) throw e;
    return NextResponse.json({ error: 'INVALID_ORDER' }, { status });
  }
}
