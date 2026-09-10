import { NextResponse } from 'next/server';
import { userRepository } from '../../../lib/repositories/user.repository';
import { getCurrentUserEmail } from '../../../lib/session';
import type { OrderItem, OnlinePaymentMethod } from '@mucho-loco/types';

// Runs server-side so the order lands in the same userRepository instance the
// dashboard reads from on its next server-rendered request. Calling
// userRepository.createOrder() straight from the checkout client component
// would mutate a separate, browser-only copy of the mock data that the
// server (and therefore the dashboard) would never see.
export async function POST(request: Request) {
  // El middleware de páginas no cubre /api/* (ver matcher en middleware.ts) —
  // esta es la única capa que protege esta ruta, así que rechazamos sin
  // sesión válida en vez de crear el pedido bajo un email vacío/anónimo.
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { items, total, paymentMethod, delivery } = (await request.json()) as {
    items: OrderItem[];
    total: number;
    paymentMethod: OnlinePaymentMethod;
    delivery: 'pickup' | 'home';
  };
  const order = await userRepository.createOrder(email, items, total, paymentMethod, delivery);
  return NextResponse.json(order);
}
