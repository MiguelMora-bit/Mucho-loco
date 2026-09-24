import type { Cfdi, FiscalProfile, MemberCharge } from '@mucho-loco/types';
import type { IInvoicingRepository, InvoiceFile } from '../contract';
import { normalizeFiscalProfile } from '../fiscal';
import { InvoicingError } from '../invoicing-errors';
import { delay } from './delay';

/**
 * Facturación sin backend ni PAC. Imita las reglas que el backend aplica
 * (ver "Facturación CFDI" en apps/backend/CLAUDE.md) para que prender
 * DATA_SOURCE=http no cambie lo que la pantalla deja hacer:
 *
 * - cada socio arranca sin datos fiscales y con un cobro de cada tipo;
 * - facturar pide datos fiscales, y un cobro ya facturado, ya en la global o
 *   sin recibo se rechaza con el mismo código que el backend;
 * - el RFC genérico `XAXX010101000` hace que "el SAT" rechace los datos, para
 *   poder ver ese error sin Facturapi (es el RFC de "público en general": un
 *   socio no puede facturarse con él).
 */
export const SAT_REJECTED_TAX_ID = 'XAXX010101000';

/** Un socio cuya semilla no tiene cobros — el estado vacío de la pantalla. */
export const NO_CHARGES_TEST_EMAIL = 'sin.cobros@mucholoco.mx';

const SAT_REJECTION =
  'El RFC del receptor no se encuentra en la lista de RFC inscritos no cancelados del SAT.';

interface InvoicingRecord {
  profile: FiscalProfile | null;
  charges: MemberCharge[];
  /** Solo las facturas individuales del socio; la global no es suya. */
  cfdis: Cfdi[];
}

// Mismo motivo que RECORDS en user.mock.ts: el Server Component y los Route
// Handlers de Next viven en capas de módulos distintas, y deben ver lo mismo.
declare global {
  var __mlInvoicingRecords: Record<string, InvoicingRecord> | undefined;
}

const RECORDS: Record<string, InvoicingRecord> =
  globalThis.__mlInvoicingRecords ?? (globalThis.__mlInvoicingRecords = {});

/** UUID v4 en mayúsculas, como los folios del SAT. Sin `crypto.randomUUID`: el móvil no lo tiene. */
function folio(): string {
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const variant = '89ab'[Math.floor(Math.random() * 4)];
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variant}${hex(3)}-${hex(12)}`.toUpperCase();
}

function seed(email: string): InvoicingRecord {
  if (email === NO_CHARGES_TEST_EMAIL) return { profile: null, charges: [], cfdis: [] };

  // Ids por socio: un id de otro socio tiene que responder "no existe".
  const key = email.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
  const id = (n: number) => `mock-${key}-${n}`;
  const invoicedCfdi: Cfdi = {
    id: `cfdi-${key}-1`,
    uuid: folio(),
    kind: 'individual',
    status: 'valid',
    cancellationStatus: 'none',
    total: 1550,
    customerTaxId: 'CUPU800825569',
    customerLegalName: 'JUAN PÉREZ',
    issuedAt: '2026-08-03T17:20:00.000Z',
  };

  // Descripciones con la misma forma que arma el backend (`toMemberCharge`):
  // el renglón más caro nombra al cobro, "y N más" si hay otros.
  const charges: MemberCharge[] = [
    {
      id: id(1),
      paidAt: '2026-09-18T19:42:00.000Z',
      total: 2080.5,
      description: 'Whey Protein 5LBS · Strawberry y 1 más',
      invoice: { status: 'available', cfdiId: null, uuid: null },
    },
    {
      id: id(2),
      paidAt: '2026-09-01T15:05:00.000Z',
      total: 1550,
      description: 'Membresía Mensual · 15 sucursales · Roma Sur',
      invoice: { status: 'available', cfdiId: null, uuid: null },
    },
    {
      id: id(3),
      paidAt: '2026-08-01T15:05:00.000Z',
      total: 1550,
      description: 'Membresía Mensual · 15 sucursales · Roma Sur',
      invoice: { status: 'invoiced', cfdiId: invoicedCfdi.id, uuid: invoicedCfdi.uuid },
    },
    {
      // Entró a la factura global de julio: el cfdiId es el de la global, que no es suya.
      id: id(4),
      paidAt: '2026-07-12T02:10:00.000Z',
      total: 290,
      description: 'Shaker Loco · 700ml',
      invoice: { status: 'closed', cfdiId: 'cfdi-global-2026-07', uuid: null },
    },
    {
      // Anterior a que existiera la facturación: no tiene recibo.
      id: id(5),
      paidAt: '2026-06-01T16:30:00.000Z',
      total: 1550,
      description: 'Membresía Mensual · 15 sucursales · Roma Sur',
      invoice: { status: 'unavailable', cfdiId: null, uuid: null },
    },
  ];
  return { profile: null, charges, cfdis: [invoicedCfdi] };
}

function recordOf(email: string): InvoicingRecord {
  return (RECORDS[email] ??= seed(email));
}

// Copia por JSON y no structuredClone: Hermes (React Native) no lo tiene, y
// mobile-app usa este mismo mock. Todo aquí es JSON puro.
const copy = <T>(value: T): T => (value === null ? value : JSON.parse(JSON.stringify(value)));

function pdfOf(cfdi: Cfdi): Uint8Array {
  const text = `Factura ${cfdi.uuid} - ${cfdi.customerLegalName} - $${cfdi.total.toFixed(2)}`;
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const pdf = [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    'trailer << /Root 1 0 R >>',
    '%%EOF',
  ].join('\n');
  return new TextEncoder().encode(pdf);
}

function xmlOf(cfdi: Cfdi): Uint8Array {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Total="${cfdi.total.toFixed(2)}" Fecha="${cfdi.issuedAt}">
  <cfdi:Receptor Rfc="${cfdi.customerTaxId}" Nombre="${cfdi.customerLegalName}"/>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" UUID="${cfdi.uuid}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>
`;
  return new TextEncoder().encode(xml);
}

export class InvoicingMockDatasource implements IInvoicingRepository {
  async getFiscalProfile(email: string): Promise<FiscalProfile | null> {
    await delay(150);
    return copy(recordOf(email).profile);
  }

  async saveFiscalProfile(email: string, profile: FiscalProfile): Promise<FiscalProfile> {
    await delay(200);
    const record = recordOf(email);
    record.profile = normalizeFiscalProfile(profile);
    return copy(record.profile);
  }

  async getCharges(email: string): Promise<MemberCharge[]> {
    await delay(150);
    return copy(recordOf(email).charges);
  }

  async invoiceCharge(email: string, chargeId: string): Promise<Cfdi> {
    await delay(400);
    const record = recordOf(email);
    const charge = record.charges.find((c) => c.id === chargeId);
    // Un cobro ajeno responde igual que uno que no existe, como el backend.
    if (!charge) throw new InvoicingError('CHARGE_NOT_FOUND');
    if (charge.invoice.status === 'unavailable') throw new InvoicingError('CHARGE_NOT_INVOICEABLE');
    if (!record.profile) throw new InvoicingError('FISCAL_PROFILE_REQUIRED');
    if (charge.invoice.status === 'invoiced') throw new InvoicingError('CHARGE_ALREADY_INVOICED');
    if (charge.invoice.status === 'closed') throw new InvoicingError('INVOICING_WINDOW_CLOSED');
    if (record.profile.taxId === SAT_REJECTED_TAX_ID) {
      throw new InvoicingError('FISCAL_DATA_REJECTED', SAT_REJECTION);
    }

    const cfdi: Cfdi = {
      id: `cfdi-${chargeId}`,
      uuid: folio(),
      kind: 'individual',
      status: 'valid',
      cancellationStatus: 'none',
      total: charge.total,
      customerTaxId: record.profile.taxId,
      customerLegalName: record.profile.legalName,
      issuedAt: new Date().toISOString(),
    };
    record.cfdis.push(cfdi);
    charge.invoice = { status: 'invoiced', cfdiId: cfdi.id, uuid: cfdi.uuid };
    return copy(cfdi);
  }

  async downloadInvoice(email: string, cfdiId: string, format: 'pdf' | 'xml'): Promise<InvoiceFile> {
    await delay(200);
    const cfdi = recordOf(email).cfdis.find((c) => c.id === cfdiId);
    if (!cfdi) throw new InvoicingError('CFDI_NOT_FOUND');
    return format === 'pdf'
      ? { data: pdfOf(cfdi), contentType: 'application/pdf', filename: `factura-${cfdi.uuid}.pdf` }
      : { data: xmlOf(cfdi), contentType: 'application/xml', filename: `factura-${cfdi.uuid}.xml` };
  }
}
