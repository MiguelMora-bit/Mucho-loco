import type { ApiClient } from '@mucho-loco/api-client';
import type { Cfdi, FiscalProfile, MemberCharge } from '@mucho-loco/types';
import type { IInvoicingRepository, InvoiceFile } from '../contract';

// Igual que los demás dominios de cuenta: siempre con token, nunca en caché, y
// el `email` del contrato se ignora — la identidad es el ID token.
const ACCOUNT = { auth: true } as const;

/** `/users/me/fiscal-profile`, `/users/me/charges`, `/users/me/invoices`. */
export class InvoicingHttpDatasource implements IInvoicingRepository {
  private readonly api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  /** El backend responde 404 FISCAL_PROFILE_NOT_FOUND si no hay: aquí es `null`. */
  getFiscalProfile(_email: string): Promise<FiscalProfile | null> {
    return this.api.getOrNull<FiscalProfile>('/users/me/fiscal-profile', ACCOUNT);
  }

  saveFiscalProfile(_email: string, profile: FiscalProfile): Promise<FiscalProfile> {
    return this.api.put<FiscalProfile>('/users/me/fiscal-profile', profile, ACCOUNT);
  }

  getCharges(_email: string): Promise<MemberCharge[]> {
    return this.api.get<MemberCharge[]>('/users/me/charges', ACCOUNT);
  }

  invoiceCharge(_email: string, chargeId: string): Promise<Cfdi> {
    return this.api.post<Cfdi>(`/users/me/charges/${encodeURIComponent(chargeId)}/invoice`, undefined, ACCOUNT);
  }

  async downloadInvoice(_email: string, cfdiId: string, format: 'pdf' | 'xml'): Promise<InvoiceFile> {
    const file = await this.api.getFile(
      `/users/me/invoices/${encodeURIComponent(cfdiId)}/${format}`,
      ACCOUNT,
    );
    return {
      data: file.data,
      contentType: file.contentType,
      filename: file.filename ?? `factura-${cfdiId}.${format}`,
    };
  }
}
