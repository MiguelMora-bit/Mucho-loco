import { NextResponse } from 'next/server';
import { invoicingErrorOf, type InvoicingErrorCode } from '@mucho-loco/customer-core/invoicing-errors';
import { invoicingRepository } from '@/lib/repositories/invoicing.repository';
import { getCurrentUserEmail } from '@/lib/session';

/** Mismo status que responde el backend para cada rechazo. */
const STATUS: Record<InvoicingErrorCode, number> = {
  FISCAL_PROFILE_REQUIRED: 400,
  CHARGE_NOT_FOUND: 404,
  CHARGE_ALREADY_INVOICED: 409,
  INVOICING_WINDOW_CLOSED: 409,
  CHARGE_NOT_INVOICEABLE: 409,
  FISCAL_DATA_REJECTED: 422,
  INVOICING_PROVIDER_ERROR: 502,
  INVOICING_UNAVAILABLE: 503,
  CFDI_NOT_FOUND: 404,
};

/**
 * Rechazos que significan "el cobro cambió de estado por fuera" (se facturó
 * en el portal, entró a la global): la respuesta trae la lista fresca para que
 * la pantalla muestre dónde está de verdad, sin recargar.
 */
const STALE: readonly InvoicingErrorCode[] = [
  'CHARGE_NOT_FOUND',
  'CHARGE_ALREADY_INVOICED',
  'INVOICING_WINDOW_CLOSED',
  'CHARGE_NOT_INVOICEABLE',
];

// Emite el CFDI de un cobro. Devuelve la factura y la lista releída: el cobro
// aparece "Facturado" sin recargar la página.
export async function POST(_request: Request, { params }: { params: Promise<{ chargeId: string }> }) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { chargeId } = await params;

  try {
    const cfdi = await invoicingRepository.invoiceCharge(email, chargeId);
    const charges = await invoicingRepository.getCharges(email);
    return NextResponse.json({ cfdi, charges });
  } catch (e) {
    // Un 500 o una red caída no es un rechazo de negocio: se relanza tal cual,
    // nunca disfrazado de "el SAT rechazó tus datos".
    const rejection = invoicingErrorOf(e);
    if (!rejection) throw e;
    const charges = STALE.includes(rejection.code) ? await invoicingRepository.getCharges(email) : undefined;
    return NextResponse.json(
      { error: rejection.code, detail: rejection.detail, charges },
      { status: STATUS[rejection.code] },
    );
  }
}
