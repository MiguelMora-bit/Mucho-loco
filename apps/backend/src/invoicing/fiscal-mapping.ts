import type {
  Charge,
  ChargeLine,
  ChargeMethod,
  Cfdi as CfdiRow,
  FiscalProfile as FiscalProfileRow,
  FiscalReceipt,
  FiscalReceiptStatus,
} from '@prisma/client';
import type {
  Cfdi,
  CfdiUse,
  ChargeInvoiceStatus,
  CounterTicket,
  FiscalProfile,
  MemberCharge,
} from '@mucho-loco/types';
import type { Invoice } from 'facturapi';
import { toCents } from '../charges/charges.service';

/**
 * c_FormaPago del SAT según cómo entró el dinero. El registro de cobros guarda
 * lo que pasó, no la clave (ver ChargeMethod); traducirla es de aquí.
 */
export const PAYMENT_FORM: Record<ChargeMethod, string> = {
  cash: '01',
  // En OXXO el cliente paga en efectivo; Stripe solo lo recibe después.
  oxxo: '01',
  spei: '03',
  transfer: '03',
  card_credit: '04',
  card_debit: '28',
  // PROVISIONAL: la terminal de mostrador todavía no dice si fue crédito o
  // débito (ver "Pendiente" en CLAUDE.md), y el SAT los distingue.
  card: '04',
};

/**
 * Renglones del cobro como conceptos del CFDI, con la clave del SAT y la tasa
 * que se congelaron al cobrar — no las de hoy.
 */
export function receiptItems(lines: ChargeLine[]) {
  return lines.map((line) => ({
    quantity: line.qty,
    product: {
      description: line.description,
      product_key: line.satProductKey,
      unit_key: line.satUnitKey,
      // IVA incluido: es el precio que vio el cliente, y el PAC lo desglosa.
      price: line.unitPriceCents / 100,
      tax_included: true,
      taxes: [{ type: 'IVA', rate: line.taxRateBp / 10_000 }],
    },
  }));
}

/** El receptor del CFDI 4.0: los cuatro datos que el SAT valida, más a dónde mandarlo. */
export function customerFromProfile(
  profile: FiscalProfileRow,
  accountEmail: string | null,
) {
  const email = profile.email ?? accountEmail;
  return {
    legal_name: profile.legalName,
    tax_id: profile.taxId,
    tax_system: profile.taxSystem,
    address: { zip: profile.zip },
    ...(email ? { email } : {}),
  };
}

/** Estados del recibo en Facturapi → los nuestros. Uno desconocido no mueve nada. */
const RECEIPT_STATUS: Record<string, FiscalReceiptStatus> = {
  open: 'open',
  canceled: 'canceled',
  invoiced_to_customer: 'invoiced_to_customer',
  invoiced_globally: 'invoiced_globally',
};

export function receiptStatus(status: string): FiscalReceiptStatus | null {
  return RECEIPT_STATUS[status] ?? null;
}

/** Lo que se guarda de una factura timbrada. */
export function cfdiFromInvoice(invoice: Invoice) {
  return {
    uuid: invoice.uuid,
    kind: invoice.global ? ('global' as const) : ('individual' as const),
    status:
      String(invoice.status) === 'canceled'
        ? ('canceled' as const)
        : ('valid' as const),
    cancellationStatus: String(invoice.cancellation_status ?? 'none'),
    totalCents: toCents(invoice.total),
    customerTaxId: invoice.customer.tax_id,
    customerLegalName: invoice.customer.legal_name,
    issuedAt: new Date(invoice.date),
  };
}

export function toFiscalProfile(row: FiscalProfileRow): FiscalProfile {
  return {
    taxId: row.taxId,
    legalName: row.legalName,
    taxSystem: row.taxSystem,
    zip: row.zip,
    cfdiUse: row.cfdiUse as CfdiUse,
    email: row.email,
  };
}

export function toCfdi(row: CfdiRow): Cfdi {
  return {
    id: row.id,
    uuid: row.uuid,
    kind: row.kind,
    status: row.status,
    cancellationStatus: row.cancellationStatus,
    total: row.totalCents / 100,
    customerTaxId: row.customerTaxId,
    customerLegalName: row.customerLegalName,
    issuedAt: row.issuedAt.toISOString(),
  };
}

/**
 * Lo que ve el socio. `pending` y `failed` también son `available`: al pedir
 * la factura, el recibo que falta se da de alta en ese momento.
 */
const INVOICE_STATUS: Record<FiscalReceiptStatus, ChargeInvoiceStatus> = {
  pending: 'available',
  open: 'available',
  failed: 'available',
  invoiced_to_customer: 'invoiced',
  invoiced_globally: 'closed',
  canceled: 'unavailable',
};

export function toMemberCharge(
  row: Charge & {
    lines: ChargeLine[];
    fiscalReceipt: (FiscalReceipt & { cfdi: CfdiRow | null }) | null;
  },
): MemberCharge {
  // El renglón más caro nombra al cobro: "Pre-Entreno Bestia y 2 más".
  const lines = [...row.lines].sort(
    (a, b) => b.unitPriceCents * b.qty - a.unitPriceCents * a.qty,
  );
  const description =
    lines.length > 1
      ? `${lines[0].description} y ${lines.length - 1} más`
      : (lines[0]?.description ?? '');
  const status: ChargeInvoiceStatus = row.fiscalReceipt
    ? INVOICE_STATUS[row.fiscalReceipt.status]
    : 'unavailable';
  return {
    id: row.id,
    paidAt: row.paidAt.toISOString(),
    total: row.totalCents / 100,
    description,
    invoice: {
      // Sin recibo = cobro anterior a la facturación: no hay qué facturar.
      status,
      cfdiId: row.fiscalReceipt?.cfdiId ?? null,
      // El folio solo si la factura es SUYA: en `closed` el CFDI es la global.
      uuid:
        status === 'invoiced' ? (row.fiscalReceipt?.cfdi?.uuid ?? null) : null,
    },
  };
}

/**
 * Qué puede hacer el cliente de mostrador con su ticket. `configured` = hay
 * llave de Facturapi: sin ella el worker nunca corre y un recibo `pending` se
 * quedaría "en proceso" para siempre, así que se dice "no disponible".
 */
export function selfInvoiceOf(
  receipt: FiscalReceipt | null,
  configured: boolean,
): CounterTicket['selfInvoice'] {
  const none = { key: null, url: null, expiresAt: null };
  if (!receipt) return { status: 'unavailable', ...none };
  switch (receipt.status) {
    case 'pending':
      return { status: configured ? 'pending' : 'unavailable', ...none };
    case 'open':
      return receipt.key && receipt.selfInvoiceUrl
        ? {
            status: 'ready',
            key: receipt.key,
            url: receipt.selfInvoiceUrl,
            expiresAt: receipt.expiresAt?.toISOString() ?? null,
          }
        : { status: configured ? 'pending' : 'unavailable', ...none };
    case 'invoiced_to_customer':
    case 'invoiced_globally':
      return { status: 'invoiced', ...none };
    case 'failed':
    case 'canceled':
      return { status: 'unavailable', ...none };
  }
}

/** El ticket de un cobro de mostrador, armado del registro de cobros (la verdad del dinero). */
export function toCounterTicket(
  row: Charge & {
    lines: ChargeLine[];
    fiscalReceipt: FiscalReceipt | null;
    branch: { name: string } | null;
  },
  kind: CounterTicket['kind'],
  sourceId: string,
  configured: boolean,
): CounterTicket {
  return {
    kind,
    sourceId,
    branchName: row.branch?.name ?? '',
    paidAt: row.paidAt.toISOString(),
    lines: row.lines.map((line) => ({
      description: line.description,
      qty: line.qty,
      unitPrice: line.unitPriceCents / 100,
    })),
    total: row.totalCents / 100,
    method: row.method,
    selfInvoice: selfInvoiceOf(row.fiscalReceipt, configured),
  };
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * El mes `YYYY-MM` en hora de Ciudad de México (UTC-6 fijo desde que México
 * quitó el horario de verano en 2022), como rango UTC `[from, to)`. Así una
 * factura del día 31 a las 23:00 local cae en su mes, no en el siguiente.
 * `null` si el texto no es un mes válido.
 */
export function mexicoMonthRange(month: string): { from: Date; to: Date } | null {
  const match = MONTH.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const index = Number(match[2]) - 1;
  const from = new Date(Date.UTC(year, index, 1, 6));
  const to = new Date(Date.UTC(year, index + 1, 1, 6));
  return { from, to };
}
