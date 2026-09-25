import { NextResponse } from 'next/server';
import type { Lang } from '@mucho-loco/types';
import { membershipErrorCode } from '@mucho-loco/customer-core/membership-errors';
import { paymentRepository } from '@/lib/repositories/payment.repository';
import { getCurrentUserEmail } from '@/lib/session';

// Portal de cliente de Stripe (spec 005): cancelar o reactivar la renovación,
// cambiar la tarjeta. Devuelve la URL a la que se manda al socio; lo que haga
// ahí llega al backend por webhook, así que al volver el panel se relee.
export async function POST(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { returnUrl, lang } = (await request.json().catch(() => ({}))) as { returnUrl?: unknown; lang?: unknown };
  if (typeof returnUrl !== 'string' || (lang !== 'es' && lang !== 'en')) {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  }

  try {
    return NextResponse.json(await paymentRepository.openBillingPortal(email, returnUrl, lang as Lang));
  } catch (e) {
    const code = membershipErrorCode(e);
    if (!code) throw e;
    return NextResponse.json({ error: code }, { status: 409 });
  }
}
