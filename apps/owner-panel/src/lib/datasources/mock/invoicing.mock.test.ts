import { describe, it, expect } from 'vitest';
import { InvoicingMockDatasource, SAT_REJECTS_CANCEL_UUID } from './invoicing.mock';
import { CancellationRejectedError, CfdiAlreadyCanceledError } from '../../repositories/invoicing.errors';
import { currentMonth, previousMonth } from '../../currentMonth';
import type { IInvoicingRepository } from '../../repositories/invoicing.repository';

const repo: IInvoicingRepository = new InvoicingMockDatasource();

describe('InvoicingMockDatasource', () => {
  it('lists only the month, newest first', async () => {
    const month = await repo.listCfdis(currentMonth());
    expect(month.length).toBeGreaterThan(0);
    expect(month.map((c) => c.issuedAt)).toEqual([...month.map((c) => c.issuedAt)].sort().reverse());
    const prev = await repo.listCfdis(previousMonth(currentMonth()));
    expect(prev.some((c) => c.kind === 'global')).toBe(true);
    expect(month.some((c) => prev.some((p) => p.id === c.id))).toBe(false);
    expect(await repo.listCfdis('1999-01')).toEqual([]);
  });

  it('flags failed receipts in the summary', async () => {
    expect((await repo.getSummary()).receipts.failed).toBeGreaterThan(0);
  });

  it('cancels a valid invoice once', async () => {
    const [valid] = (await repo.listCfdis(currentMonth())).filter((c) => c.status === 'valid' && c.uuid !== SAT_REJECTS_CANCEL_UUID);
    expect((await repo.cancel(valid.id, '02')).status).toBe('canceled');
    await expect(repo.cancel(valid.id, '02')).rejects.toBeInstanceOf(CfdiAlreadyCanceledError);
  });

  it("the SAT can reject a cancellation, with its reason", async () => {
    const rejected = (await repo.listCfdis(currentMonth())).find((c) => c.uuid === SAT_REJECTS_CANCEL_UUID)!;
    await expect(repo.cancel(rejected.id, '03')).rejects.toBeInstanceOf(CancellationRejectedError);
  });

  it('downloads PDF and XML', async () => {
    const [cfdi] = await repo.listCfdis(currentMonth());
    const pdf = await repo.download(cfdi.id, 'pdf');
    expect(new TextDecoder().decode(pdf.data)).toMatch(/^%PDF-/);
    const xml = await repo.download(cfdi.id, 'xml');
    expect(new TextDecoder().decode(xml.data)).toContain(cfdi.uuid);
  });
});
