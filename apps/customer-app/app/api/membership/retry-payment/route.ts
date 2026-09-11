import { NextResponse } from 'next/server';
import { userRepository } from '@/lib/repositories/user.repository';
import { getCurrentUserEmail } from '@/lib/session';

// Mismo motivo que POST /api/orders: corre server-side para mutar la misma
// instancia (compartida vía globalThis) de userRepository que lee el
// dashboard, no una copia aislada del browser.
export async function POST() {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const membership = await userRepository.retryMembershipPayment(email);
  return NextResponse.json(membership);
}
