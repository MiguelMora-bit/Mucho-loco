import { NextResponse } from 'next/server';
import { userRepository } from '../../../lib/repositories/user.repository';
import type { OrderItem, OnlinePaymentMethod } from '@mucho-loco/types';

// Runs server-side so the order lands in the same userRepository instance the
// dashboard reads from on its next server-rendered request. Calling
// userRepository.createOrder() straight from the checkout client component
// would mutate a separate, browser-only copy of the mock data that the
// server (and therefore the dashboard) would never see.
export async function POST(request: Request) {
  const { items, total, paymentMethod, delivery } = (await request.json()) as {
    items: OrderItem[];
    total: number;
    paymentMethod: OnlinePaymentMethod;
    delivery: 'pickup' | 'home';
  };
  const order = await userRepository.createOrder(items, total, paymentMethod, delivery);
  return NextResponse.json(order);
}
