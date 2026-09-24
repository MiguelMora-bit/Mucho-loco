'use client';

import { useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import type { Cfdi, FiscalProfile, Lang, MemberCharge } from '@mucho-loco/types';
import type { InvoicingErrorCode } from '@mucho-loco/customer-core/invoicing-errors';
import { formatDateTime } from '@mucho-loco/customer-core/dates';
import { formatMoney } from '@mucho-loco/customer-core/pricing';
import { useT } from '@/lib/hooks/useT';
import { ApiError, postJson } from '@/lib/api-client';

export interface InvoiceRejection {
  /** `null` = no fue un rechazo de negocio (red, 500): error de conexión genérico. */
  code: InvoicingErrorCode | null;
  detail?: string;
  /** La lista releída cuando el cobro cambió de estado por fuera. */
  charges?: MemberCharge[];
}

interface InvoiceConfirmProps {
  charge: MemberCharge;
  profile: FiscalProfile;
  onInvoiced: (result: { cfdi: Cfdi; charges: MemberCharge[] }) => void;
  onRejected: (rejection: InvoiceRejection) => void;
  onCancel: () => void;
  onUnauthorized: () => void;
}

/**
 * Resumen antes de timbrar: qué cobro y a nombre de quién. Una factura emitida
 * no se corrige desde la app (FR-010), así que el socio la ve antes.
 */
export function InvoiceConfirm({ charge, profile, onInvoiced, onRejected, onCancel, onUnauthorized }: InvoiceConfirmProps) {
  const t = useT();
  const lang = useLocale() as Lang;
  const copy = t.invoicing.confirm;
  const [sending, setSending] = useState(false);
  // Un doble clic llega antes de que React vuelva a pintar el botón
  // deshabilitado: el ref corta el segundo envío en el mismo tick. El backend
  // igual nunca factura dos veces, pero así no se ve un error de más.
  const inFlight = useRef(false);

  async function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    try {
      onInvoiced(
        await postJson<{ cfdi: Cfdi; charges: MemberCharge[] }>(
          `/api/invoicing/charges/${encodeURIComponent(charge.id)}/invoice`,
          {},
        ),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      const data = err instanceof ApiError ? err.data : undefined;
      onRejected({
        code: err instanceof ApiError && typeof err.code === 'string' && err.code in t.invoicing.errors
          ? (err.code as InvoicingErrorCode)
          : null,
        detail: typeof data?.detail === 'string' ? data.detail : undefined,
        charges: Array.isArray(data?.charges) ? (data.charges as MemberCharge[]) : undefined,
      });
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={sending ? undefined : onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-confirm-title"
        data-charge-id={charge.id}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape' && !sending) onCancel(); }}
        className="w-full max-w-[520px] bg-ml-black border border-ml-border p-6 grid gap-4"
      >
        <h2 id="invoice-confirm-title" className="font-display text-[32px] leading-none">{copy.title}</h2>
        <div>
          <div className="font-mono text-10 text-ml-cream-dim uppercase tracking-wide-xl mb-1">{copy.chargeLabel}</div>
          <div>{charge.description}</div>
          <div className="text-sm text-ml-cream-dim">{formatDateTime(charge.paidAt, lang)} · {formatMoney(charge.total, lang)}</div>
        </div>
        <div>
          <div className="font-mono text-10 text-ml-cream-dim uppercase tracking-wide-xl mb-1">{copy.fiscalLabel}</div>
          <div>{profile.legalName}</div>
          <div className="text-sm text-ml-cream-dim">{profile.taxId} · {profile.taxSystem} · {t.invoicing.fiscal.zip} {profile.zip} · {profile.cfdiUse}</div>
        </div>
        <p className="text-sm border border-ml-border p-3">{copy.warning}</p>
        <div className="flex gap-3">
          <button
            type="button"
            autoFocus
            onClick={confirm}
            disabled={sending}
            className="flex-1 p-4 bg-ml-red text-ml-cream font-display text-22 tracking-[0.04em] border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? copy.confirming : copy.confirm}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="px-5 border border-ml-border text-ml-cream bg-transparent font-bebas tracking-wide cursor-pointer disabled:opacity-40"
          >
            {copy.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
