import { ApiRequestError } from '@mucho-loco/api-client';

/**
 * Rechazos de negocio al facturar — los mismos códigos que el backend promete
 * en el cuerpo del 4xx/5xx (`common/error-codes.ts`). "Sin datos fiscales" NO
 * está aquí: al leer es `null` (el socio todavía no los captura), no un error.
 */
export type InvoicingErrorCode =
  | 'FISCAL_PROFILE_REQUIRED'
  | 'CHARGE_NOT_FOUND'
  | 'CHARGE_ALREADY_INVOICED'
  | 'INVOICING_WINDOW_CLOSED'
  | 'CHARGE_NOT_INVOICEABLE'
  | 'INVOICING_UNAVAILABLE'
  | 'FISCAL_DATA_REJECTED'
  | 'INVOICING_PROVIDER_ERROR'
  | 'CFDI_NOT_FOUND';

const CODES: readonly string[] = [
  'FISCAL_PROFILE_REQUIRED',
  'CHARGE_NOT_FOUND',
  'CHARGE_ALREADY_INVOICED',
  'INVOICING_WINDOW_CLOSED',
  'CHARGE_NOT_INVOICEABLE',
  'INVOICING_UNAVAILABLE',
  'FISCAL_DATA_REJECTED',
  'INVOICING_PROVIDER_ERROR',
  'CFDI_NOT_FOUND',
];

export interface InvoicingRejection {
  code: InvoicingErrorCode;
  /** Solo en FISCAL_DATA_REJECTED: el motivo del SAT, tal cual — es lo que el socio corrige. */
  detail?: string;
}

/** Lo que tira el mock para el mismo rechazo que el backend responde con un 4xx/5xx. */
export class InvoicingError extends Error {
  readonly name = 'InvoicingError';
  readonly code: InvoicingErrorCode;
  readonly detail?: string;

  constructor(code: InvoicingErrorCode, detail?: string) {
    super(detail ?? code);
    this.code = code;
    this.detail = detail;
  }
}

/**
 * El rechazo, venga del mock o del backend — o `null` si no es de negocio
 * (bug, 500, red caída) y debe propagarse como error real. Mismo problema que
 * resuelve `membershipErrorCode`: la pantalla no debe notar qué datasource hay.
 */
export function invoicingErrorOf(e: unknown): InvoicingRejection | null {
  if (e instanceof InvoicingError) {
    return e.detail === undefined ? { code: e.code } : { code: e.code, detail: e.detail };
  }
  if (e instanceof ApiRequestError && e.code && CODES.includes(e.code)) {
    const detail = typeof e.body.detail === 'string' ? e.body.detail : undefined;
    return detail === undefined
      ? { code: e.code as InvoicingErrorCode }
      : { code: e.code as InvoicingErrorCode, detail };
  }
  return null;
}
