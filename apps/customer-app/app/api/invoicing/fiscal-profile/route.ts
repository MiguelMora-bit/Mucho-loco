import { NextResponse } from 'next/server';
import type { FiscalProfile } from '@mucho-loco/types';
import { validateFiscalProfile } from '@mucho-loco/customer-core/fiscal';
import { invoicingRepository } from '@/lib/repositories/invoicing.repository';
import { getCurrentUserEmail } from '@/lib/session';

// Guarda los datos fiscales del socio. Aquí y no en el navegador: la cookie
// de sesión solo se lee en el servidor, y el mock tiene que ser el mismo que
// lee la página. El middleware no cubre /api/*: esta ruta valida sesión sola.
export async function PUT(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // El body viene del navegador: solo se toman los campos del contrato.
  const raw = (await request.json().catch(() => null)) as Partial<Record<keyof FiscalProfile, unknown>> | null;
  const text = (v: unknown) => (typeof v === 'string' ? v : '');
  const profile: FiscalProfile = {
    taxId: text(raw?.taxId),
    legalName: text(raw?.legalName),
    taxSystem: text(raw?.taxSystem),
    zip: text(raw?.zip),
    cfdiUse: text(raw?.cfdiUse) as FiscalProfile['cfdiUse'],
    email: text(raw?.email).trim() || null,
  };

  // Misma validación de forma que el formulario: un navegador que se la
  // salte recibe el mismo 400 por campo, no un error del backend.
  const fields = validateFiscalProfile(profile);
  if (Object.keys(fields).length > 0) {
    return NextResponse.json({ error: 'INVALID_FISCAL_PROFILE', fields }, { status: 400 });
  }

  return NextResponse.json(await invoicingRepository.saveFiscalProfile(email, profile));
}
