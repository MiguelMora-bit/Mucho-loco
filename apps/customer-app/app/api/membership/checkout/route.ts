import { NextResponse } from 'next/server';
import type { Lang, MembershipPlanChoice } from '@mucho-loco/types';
import { membershipErrorCode } from '@mucho-loco/customer-core/membership-errors';
import { paymentRepository } from '@/lib/repositories/payment.repository';
import { getCurrentUserEmail } from '@/lib/session';

// Server-side por lo mismo que POST /api/checkout: la cookie httpOnly que
// autentica contra el backend solo se lee aquí. El precio no viaja: se arma
// del lado del backend desde sucursal + tier + periodo.
export async function POST(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { plan, lang, successUrl, cancelUrl } = (await request.json()) as {
    plan: MembershipPlanChoice;
    lang: Lang;
    successUrl: string;
    cancelUrl: string;
  };

  try {
    // Solo los tres campos del plan: cualquier otra cosa que mande el browser
    // (un importe, por ejemplo) se queda aquí.
    const session = await paymentRepository.createMembershipCheckout(
      email,
      { branchId: plan.branchId, tierKey: plan.tierKey, periodKey: plan.periodKey },
      lang,
      successUrl,
      cancelUrl,
    );
    return NextResponse.json(session);
  } catch (e) {
    const code = membershipErrorCode(e);
    if (!code) throw e;
    return NextResponse.json({ error: code }, { status: code === 'BRANCH_NOT_FOUND' ? 404 : 409 });
  }
}
