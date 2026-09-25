import type { Cfdi, CfdiCancellationMotive, InvoicingSummary } from '@mucho-loco/types';
import type { CfdiFile, IInvoicingRepository } from '../../repositories/invoicing.repository';
import {
  CancellationRejectedError,
  CfdiAlreadyCanceledError,
  InvoicingUnavailableError,
} from '../../repositories/invoicing.errors';
import { ApiRequestError, api } from './client';

/** Traduce el código del backend al error tipado del contrato; lo demás pasa tal cual. */
function toDomainError(e: unknown, cfdiId: string): unknown {
  if (!(e instanceof ApiRequestError) || !e.code) return e;
  switch (e.code) {
    case 'CANCELLATION_REJECTED':
      return new CancellationRejectedError(cfdiId, typeof e.body.detail === 'string' ? e.body.detail : e.message);
    case 'CFDI_ALREADY_CANCELED':
      return new CfdiAlreadyCanceledError(cfdiId);
    case 'INVOICING_UNAVAILABLE':
    case 'INVOICING_PROVIDER_ERROR':
      return new InvoicingUnavailableError();
    default:
      return e;
  }
}

export class InvoicingHttpDatasource implements IInvoicingRepository {
  listCfdis(month: string): Promise<Cfdi[]> {
    return api.get<Cfdi[]>('/invoicing/cfdis', { query: { month } });
  }

  getSummary(): Promise<InvoicingSummary> {
    return api.get<InvoicingSummary>('/invoicing/summary');
  }

  async cancel(cfdiId: string, motive: CfdiCancellationMotive): Promise<Cfdi> {
    try {
      return await api.post<Cfdi>(`/invoicing/cfdis/${encodeURIComponent(cfdiId)}/cancel`, { motive });
    } catch (e) {
      throw toDomainError(e, cfdiId);
    }
  }

  async download(cfdiId: string, format: 'pdf' | 'xml'): Promise<CfdiFile> {
    try {
      const file = await api.getFile(`/invoicing/cfdis/${encodeURIComponent(cfdiId)}/${format}`);
      return { data: file.data, contentType: file.contentType, filename: file.filename ?? `cfdi-${cfdiId}.${format}` };
    } catch (e) {
      throw toDomainError(e, cfdiId);
    }
  }
}
