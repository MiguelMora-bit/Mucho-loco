import { NextResponse } from 'next/server';
import { invoicingErrorOf } from '@mucho-loco/customer-core/invoicing-errors';
import { invoicingRepository } from '@/lib/repositories/invoicing.repository';
import { getCurrentUserEmail } from '@/lib/session';

const FORMATS = ['pdf', 'xml'] as const;
type Format = (typeof FORMATS)[number];

// Descarga el PDF o XML de una factura del socio. Pasa por aquí porque el
// token vive en una cookie httpOnly: el navegador no puede llamar al backend
// con él. Solo facturas propias (el repositorio responde CFDI_NOT_FOUND).
export async function GET(_request: Request, { params }: { params: Promise<{ cfdiId: string; format: string }> }) {
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const { cfdiId, format } = await params;
  if (!FORMATS.includes(format as Format)) {
    return NextResponse.json({ error: 'INVALID_FORMAT' }, { status: 400 });
  }

  try {
    const file = await invoicingRepository.downloadInvoice(email, cfdiId, format as Format);
    return new Response(file.data as BodyInit, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.filename.replace(/"/g, '')}"`,
        // Es un documento fiscal de una persona: nada de cachés compartidos.
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    const rejection = invoicingErrorOf(e);
    if (rejection?.code !== 'CFDI_NOT_FOUND') throw e;
    return NextResponse.json({ error: rejection.code }, { status: 404 });
  }
}
