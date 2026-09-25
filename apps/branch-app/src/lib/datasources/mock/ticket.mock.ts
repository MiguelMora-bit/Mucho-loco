import type { CounterTicket, PaymentMethod, PlanKey, TierKey } from '@mucho-loco/types';
import { COUNTER_SALES, MEMBERSHIP_PAYMENTS } from '../../data';
import { getCurrentBranchName } from '../../currentBranch';
import type { ITicketRepository } from '../../repositories/ticket.repository';
import { TicketNotFoundError, type TicketKind } from '../../repositories/ticket.errors';
import { delay } from './delay';

/** Cuánto tarda el "worker" del mock en dar de alta el recibo: se ve "en proceso" y luego la clave. */
export const MOCK_RECEIPT_DELAY_MS = 4000;

const PERIOD: Record<PlanKey, string> = {
  visit: 'Visita',
  weekly: 'Semanal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  annual: 'Anual',
};
const TIER: Record<TierKey, string> = { single: '1 sucursal', all: '15 sucursales' };

function method(paymentMethod: PaymentMethod): CounterTicket['method'] {
  return paymentMethod === 'card' ? 'card' : paymentMethod === 'transfer' ? 'transfer' : 'cash';
}

function branchName(branchId: number): string {
  try {
    return getCurrentBranchName();
  } catch {
    return `Sucursal ${branchId}`;
  }
}

/** Clave estable por cobro, con la forma del portal de Facturapi. */
function keyFor(sourceId: string): string {
  let hash = 0;
  for (const ch of sourceId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `ML-${hash.toString(36).toUpperCase().padStart(8, '0').slice(-8)}`;
}

function selfInvoice(createdAt: string, sourceId: string, now: number): CounterTicket['selfInvoice'] {
  if (now - new Date(createdAt).getTime() < MOCK_RECEIPT_DELAY_MS) {
    return { status: 'pending', key: null, url: null, expiresAt: null };
  }
  const key = keyFor(sourceId);
  const paid = new Date(createdAt);
  // Fin del mes del cobro: después entra a la factura global.
  const expires = new Date(Date.UTC(paid.getUTCFullYear(), paid.getUTCMonth() + 1, 1));
  return { status: 'ready', key, url: `https://factura.space/mucholoco/${key}`, expiresAt: expires.toISOString() };
}

export class TicketMockDatasource implements ITicketRepository {
  // Campo declarado a mano, no parameter property: `erasableSyntaxOnly` la prohíbe.
  private readonly now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  async getTicket(kind: TicketKind, sourceId: string, branchId: number): Promise<CounterTicket> {
    await delay(150);
    if (kind === 'sale') {
      const sale = COUNTER_SALES.find((s) => s.id === sourceId && s.branchId === branchId);
      if (!sale) throw new TicketNotFoundError(kind, sourceId);
      return {
        kind,
        sourceId,
        branchName: branchName(branchId),
        paidAt: sale.createdAt,
        lines: sale.items.map((i) => ({ description: i.productName, qty: i.qty, unitPrice: i.unitPrice })),
        total: sale.total,
        method: method(sale.paymentMethod),
        selfInvoice: selfInvoice(sale.createdAt, sourceId, this.now()),
      };
    }
    const payment = MEMBERSHIP_PAYMENTS.find((p) => p.id === sourceId && p.branchId === branchId);
    if (!payment) throw new TicketNotFoundError(kind, sourceId);
    const name = branchName(branchId);
    return {
      kind,
      sourceId,
      branchName: name,
      paidAt: payment.createdAt,
      lines: [
        {
          description: `Membresía ${PERIOD[payment.periodKey]} · ${TIER[payment.tierKey]} · ${name}`,
          qty: 1,
          unitPrice: payment.amount,
        },
      ],
      total: payment.amount,
      method: method(payment.paymentMethod),
      selfInvoice: selfInvoice(payment.createdAt, sourceId, this.now()),
    };
  }
}
