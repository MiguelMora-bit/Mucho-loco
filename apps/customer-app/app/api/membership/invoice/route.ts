import { NextResponse } from 'next/server';
import { membershipErrorCode } from '@mucho-loco/customer-core/membership-errors';
import { paymentRepository } from '@/lib/repositories/payment.repository';
import { getCurrentUserEmail } from '@/lib/session';

// Periodo de gracia: devuelve la página de Stripe con la factura que falló.
// Reemplaza a /api/membership/retry-payment, que "reactivaba" la membresía
// sin cobrar nada.
export async function POST(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { returnUrl } = (await request.json()) as { returnUrl: string };

  try {
    return NextResponse.json(await paymentRepository.openMembershipInvoice(email, returnUrl));
  } catch (e) {
    const code = membershipErrorCode(e);
    if (!code) throw e;
    return NextResponse.json({ error: code }, { status: 409 });
  }
}
