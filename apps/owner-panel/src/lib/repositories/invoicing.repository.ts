import type { Cfdi, CfdiCancellationMotive, InvoicingSummary } from '@mucho-loco/types';
import { InvoicingMockDatasource } from '../datasources/mock/invoicing.mock';
import { InvoicingHttpDatasource } from '../datasources/http/invoicing.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export { CancellationRejectedError, CfdiAlreadyCanceledError, InvoicingUnavailableError } from './invoicing.errors';

export interface CfdiFile {
  data: Uint8Array;
  contentType: string;
  filename: string;
}

/** Facturas (CFDI) de HQ — spec 004. Un solo RFC para las 15 sucursales. */
export interface IInvoicingRepository {
  /** TODAS las del mes `YYYY-MM` en hora de CDMX, la más reciente primero. */
  listCfdis(month: string): Promise<Cfdi[]>;
  getSummary(): Promise<InvoicingSummary>;
  /** Motivos del SAT que se aceptan hoy: 02 (con errores sin relación) y 03 (no se realizó). */
  cancel(cfdiId: string, motive: CfdiCancellationMotive): Promise<Cfdi>;
  download(cfdiId: string, format: 'pdf' | 'xml'): Promise<CfdiFile>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const invoicingRepository: IInvoicingRepository = isHttpDatasourceEnabled()
  ? new InvoicingHttpDatasource()
  : new InvoicingMockDatasource();
