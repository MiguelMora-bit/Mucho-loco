'use client';

import { useLocale } from 'next-intl';
import type { Lang, MemberCharge } from '@mucho-loco/types';
import { formatDateTime } from '@mucho-loco/customer-core/dates';
import { formatMoney } from '@mucho-loco/customer-core/pricing';
import { useT } from '@/lib/hooks/useT';
import { whatsappUrl } from '@/lib/contact';
import { fill } from './fill';

const STATUS_CLASS: Record<MemberCharge['invoice']['status'], string> = {
  available: 'border-ml-red text-ml-cream',
  invoiced: 'border-ml-border text-ml-cream',
  closed: 'border-ml-border text-ml-cream-dim',
  unavailable: 'border-ml-border text-ml-cream-dim',
};
const LINK_CLASS = 'px-3 py-2 border border-ml-border text-ml-cream font-mono text-11 uppercase no-underline hover:border-ml-red';

interface ChargeListProps {
  charges: MemberCharge[];
  onInvoice: (chargeId: string) => void;
}

/**
 * Los cobros del socio, en el orden en que llegan (el más nuevo primero).
 * La descripción es el concepto fiscal registrado al cobrar y se muestra tal
 * cual: no se traduce (spec, casos límite).
 */
export function ChargeList({ charges, onInvoice }: ChargeListProps) {
  const t = useT();
  const lang = useLocale() as Lang;
  const copy = t.invoicing;

  if (charges.length === 0) {
    return <p className="text-ml-cream-dim border border-ml-border p-6">{copy.charges.empty}</p>;
  }

  return (
    <ul className="grid gap-3 list-none p-0 m-0">
      {charges.map((charge) => {
        const { status, cfdiId, uuid } = charge.invoice;
        const date = formatDateTime(charge.paidAt, lang);
        return (
          <li
            key={charge.id}
            data-charge-id={charge.id}
            data-charge-status={status}
            data-charge-uuid={uuid ?? undefined}
            className="bg-ml-card border border-ml-border p-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div>
              <div className="font-mono text-11 text-ml-cream-dim uppercase">{date}</div>
              <div className="text-[15px] mt-1" data-charge-description>{charge.description}</div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`font-mono text-10 uppercase tracking-wide px-2 py-1 border ${STATUS_CLASS[status]}`}>
                  {copy.status[status].label}
                </span>
                <span className="text-xs text-ml-cream-dim">{copy.status[status].hint}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <b className="font-display text-22 mr-2">{formatMoney(charge.total, lang)}</b>
              {status === 'available' && (
                <button
                  type="button"
                  onClick={() => onInvoice(charge.id)}
                  className="px-4 py-2.5 bg-ml-red text-ml-cream font-bebas tracking-wide border-none cursor-pointer"
                >
                  {copy.charges.invoice}
                </button>
              )}
              {/* Solo facturas individuales del socio: en `closed` el CFDI es la global. */}
              {status === 'invoiced' && cfdiId && (
                <>
                  <a href={`/api/invoicing/invoices/${encodeURIComponent(cfdiId)}/pdf`} download className={LINK_CLASS}>
                    {copy.charges.downloadPdf}
                  </a>
                  <a href={`/api/invoicing/invoices/${encodeURIComponent(cfdiId)}/xml`} download className={LINK_CLASS}>
                    {copy.charges.downloadXml}
                  </a>
                  {uuid && (
                    <a
                      href={whatsappUrl(fill(copy.charges.whatsappMessage, { description: charge.description, date, uuid }))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-ml-cream-dim underline"
                    >
                      {copy.charges.wrongData}
                    </a>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
