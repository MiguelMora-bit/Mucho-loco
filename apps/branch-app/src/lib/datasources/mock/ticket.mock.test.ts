import { describe, it, expect } from 'vitest';
import { COUNTER_SALES, MEMBERSHIP_PAYMENTS } from '../../data';
import { TicketNotFoundError } from '../../repositories/ticket.errors';
import { MOCK_RECEIPT_DELAY_MS, TicketMockDatasource } from './ticket.mock';

const sale = COUNTER_SALES[0];
const payment = MEMBERSHIP_PAYMENTS[0];
const paidAt = (iso: string) => new Date(iso).getTime();

describe('TicketMockDatasource', () => {
  it('a fresh sale has its ticket with the key still in process', async () => {
    const repo = new TicketMockDatasource(() => paidAt(sale.createdAt) + 1000);
    const ticket = await repo.getTicket('sale', sale.id, sale.branchId);

    expect(ticket).toMatchObject({ kind: 'sale', sourceId: sale.id, total: sale.total });
    expect(ticket.lines).toHaveLength(sale.items.length);
    expect(ticket.selfInvoice).toEqual({ status: 'pending', key: null, url: null, expiresAt: null });
  });

  it('a few seconds later the key and portal are ready, always the same for that charge', async () => {
    const later = () => paidAt(sale.createdAt) + MOCK_RECEIPT_DELAY_MS + 1;
    const a = await new TicketMockDatasource(later).getTicket('sale', sale.id, sale.branchId);
    const b = await new TicketMockDatasource(later).getTicket('sale', sale.id, sale.branchId);

    expect(a.selfInvoice.status).toBe('ready');
    expect(a.selfInvoice.key).toMatch(/^ML-[0-9A-Z]{8}$/);
    expect(a.selfInvoice.url).toBe(`https://factura.space/mucholoco/${a.selfInvoice.key}`);
    expect(b.selfInvoice.key).toBe(a.selfInvoice.key);
  });

  it('a membership paid at the counter has a ticket with one line', async () => {
    const ticket = await new TicketMockDatasource().getTicket('membership', payment.id, payment.branchId);
    expect(ticket.lines).toEqual([expect.objectContaining({ qty: 1, unitPrice: payment.amount })]);
    expect(ticket.lines[0].description).toMatch(/^Membresía /);
  });

  it("another branch's charge does not exist", async () => {
    await expect(new TicketMockDatasource().getTicket('sale', sale.id, 99)).rejects.toBeInstanceOf(TicketNotFoundError);
  });
});
