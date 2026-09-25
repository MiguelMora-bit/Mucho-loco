import type { Cfdi, InvoicingSummary } from '@mucho-loco/types';
import type { CfdiFile, IInvoicingRepository } from '../../repositories/invoicing.repository';
import { CancellationRejectedError, CfdiAlreadyCanceledError } from '../../repositories/invoicing.errors';
import { currentMonth, inMonth, previousMonth } from '../../currentMonth';
import { delay } from './delay';

/** Folio cuya cancelación "rechaza el SAT": para ver ese error sin Facturapi. */
export const SAT_REJECTS_CANCEL_UUID = 'D1A2B3C4-0000-4000-8000-00000000BAD0';
const SAT_REJECTION = 'El receptor no ha aceptado la cancelación en el plazo de 72 horas.';

/** Un instante del mes `YYYY-MM` (día y hora locales de CDMX). */
function at(month: string, day: number, hour: number): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day, hour + 6)).toISOString();
}

function seed(): Cfdi[] {
  const now = currentMonth();
  const prev = previousMonth(now);
  const c = (id: string, uuid: string, kind: Cfdi['kind'], issuedAt: string, total: number, taxId: string, name: string, status: Cfdi['status'] = 'valid'): Cfdi => ({
    id, uuid, kind, status, cancellationStatus: status === 'canceled' ? 'accepted' : 'none', total, customerTaxId: taxId, customerLegalName: name, issuedAt,
  });
  return [
    c('cfdi-1', 'A1B2C3D4-1111-4111-8111-000000000001', 'individual', at(now, 3, 10), 1550, 'CUPU800825569', 'JUAN PÉREZ'),
    c('cfdi-2', 'A1B2C3D4-2222-4222-8222-000000000002', 'individual', at(now, 2, 18), 2080.5, 'RAMD900101AB1', 'DIEGO RAMÍREZ'),
    c('cfdi-3', SAT_REJECTS_CANCEL_UUID, 'individual', at(now, 1, 9), 290, 'GOMV850310XY2', 'GIMNASIOS DEL NORTE, "LA BESTIA"'),
    c('cfdi-4', 'A1B2C3D4-4444-4444-8444-000000000004', 'individual', at(now, 1, 8), 1090, 'LOTA920202QQ1', 'ANA LÓPEZ', 'canceled'),
    c('cfdi-5', 'A1B2C3D4-5555-4555-8555-000000000005', 'global', at(prev, 28, 23), 184320, 'XAXX010101000', 'PUBLICO EN GENERAL'),
    c('cfdi-6', 'A1B2C3D4-6666-4666-8666-000000000006', 'individual', at(prev, 15, 12), 1550, 'CUPU800825569', 'JUAN PÉREZ'),
  ];
}

const CFDIS: Cfdi[] = seed();

/** Mismas reglas que InvoicingService del backend: solo vigentes se cancelan. */
export class InvoicingMockDatasource implements IInvoicingRepository {
  async listCfdis(month: string): Promise<Cfdi[]> {
    await delay(150);
    return CFDIS.filter((c) => inMonth(c.issuedAt, month))
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
      .map((c) => ({ ...c }));
  }

  async getSummary(): Promise<InvoicingSummary> {
    await delay(100);
    return { receipts: { pending: 3, open: 128, invoicedToCustomer: CFDIS.filter((c) => c.kind === 'individual').length, invoicedGlobally: 412, canceled: 1, failed: 2 } };
  }

  // El motivo no cambia nada en el mock: el SAT solo lo registra.
  async cancel(cfdiId: string): Promise<Cfdi> {
    await delay(300);
    const cfdi = CFDIS.find((c) => c.id === cfdiId);
    if (!cfdi) throw new Error(`CFDI not found: ${cfdiId}`);
    if (cfdi.status === 'canceled') throw new CfdiAlreadyCanceledError(cfdiId);
    if (cfdi.uuid === SAT_REJECTS_CANCEL_UUID) throw new CancellationRejectedError(cfdiId, SAT_REJECTION);
    cfdi.status = 'canceled';
    cfdi.cancellationStatus = 'accepted';
    return { ...cfdi };
  }

  async download(cfdiId: string, format: 'pdf' | 'xml'): Promise<CfdiFile> {
    await delay(150);
    const cfdi = CFDIS.find((c) => c.id === cfdiId);
    if (!cfdi) throw new Error(`CFDI not found: ${cfdiId}`);
    const text =
      format === 'pdf'
        ? `%PDF-1.4\n% CFDI ${cfdi.uuid}\n%%EOF\n`
        : `<?xml version="1.0" encoding="UTF-8"?><cfdi:Comprobante Total="${cfdi.total.toFixed(2)}"><tfd:TimbreFiscalDigital UUID="${cfdi.uuid}"/></cfdi:Comprobante>`;
    return {
      data: new TextEncoder().encode(text),
      contentType: format === 'pdf' ? 'application/pdf' : 'application/xml',
      filename: `${cfdi.uuid}.${format}`,
    };
  }
}
