import { NextResponse } from 'next/server';
import { toE164 } from '@mucho-loco/customer-core/phone';
import { userRepository } from '@/lib/repositories/user.repository';
import { getCurrentUserEmail } from '@/lib/session';

// Completar o cambiar el teléfono del socio (spec 015). Aquí y no en el
// navegador: la cookie de sesión solo se lee en el servidor. El middleware no
// cubre /api/*: esta ruta valida sesión sola.
export async function PUT(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // Mismo criterio que el formulario: un navegador que se lo salte recibe el
  // mismo 400, no uno del backend. Solo se toma el teléfono del body.
  const raw = (await request.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = typeof raw?.phone === 'string' ? toE164(raw.phone) : null;
  if (!phone) {
    return NextResponse.json({ error: 'INVALID_PHONE' }, { status: 400 });
  }

  return NextResponse.json(await userRepository.updatePhone(email, phone));
}
