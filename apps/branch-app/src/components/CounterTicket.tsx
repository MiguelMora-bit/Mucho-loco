import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import type { CounterTicket as Ticket } from '@mucho-loco/types';
import { ticketRepository, TicketNotFoundError, type TicketKind } from '../lib/repositories/ticket.repository';
import { nextPollDelay } from '../lib/ticketPolling';
import { formatDate, formatDateTime, langOf } from '../lib/dates';

interface CounterTicketProps {
  kind: TicketKind;
  sourceId: string;
  branchId: number;
  onClose: () => void;
}

function formatMoney(amount: number, lang: 'es' | 'en'): string {
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * El ticket que se le da al cliente de mostrador, con su clave de
 * autofactura (spec 003). La clave la crea el backend en segundo plano: si
 * todavía no está, el ticket se vuelve a pedir solo cada pocos segundos —
 * el cobro nunca espera a la facturación. "Imprimir" usa la impresión del
 * navegador; `index.css` deja solo `#ticket` en 80 mm.
 */
export function CounterTicket({ kind, sourceId, branchId, onClose }: CounterTicketProps) {
  const { t, i18n } = useTranslation();
  const lang = langOf(i18n.language);
  // El ticket junto con cuánto llevaba el polling cuando llegó: con eso se
  // decide al pintar si se sigue preguntando, sin estado extra.
  const [loaded, setLoaded] = useState<{ ticket: Ticket; elapsedMs: number } | null>(null);
  const [error, setError] = useState<'notFound' | 'loadError' | null>(null);
  const startedAt = useRef(0);

  const load = useCallback(async () => {
    try {
      const ticket = await ticketRepository.getTicket(kind, sourceId, branchId);
      setLoaded({ ticket, elapsedMs: Date.now() - startedAt.current });
      setError(null);
    } catch (e) {
      setError(e instanceof TicketNotFoundError ? 'notFound' : 'loadError');
    }
  }, [kind, sourceId, branchId]);

  useEffect(() => {
    startedAt.current = Date.now();
    void load();
  }, [load]);

  const ticket = loaded?.ticket ?? null;
  const wait = loaded ? nextPollDelay(loaded.ticket.selfInvoice.status, loaded.elapsedMs) : null;
  // Pasó el límite y la clave sigue en proceso: se deja de preguntar y se ofrece "Actualizar".
  const stopped = loaded?.ticket.selfInvoice.status === 'pending' && wait === null;

  // Mientras la clave esté en proceso, se vuelve a pedir.
  useEffect(() => {
    if (wait === null) return;
    const timer = setTimeout(() => void load(), wait);
    return () => clearTimeout(timer);
  }, [loaded, wait, load]);

  function refresh() {
    startedAt.current = Date.now();
    void load();
  }

  const invoice = ticket?.selfInvoice;

  return (
    <div className="bg-ml-card border border-ml-border rounded p-4 mb-6">
      {error && <p role="alert" className="text-ml-red-bright text-sm mb-3">{t(`ticket.${error}`)}</p>}
      {!ticket && !error && <p className="text-ml-muted text-sm">…</p>}

      {ticket && (
        <div id="ticket" className="ticket font-mono text-sm space-y-2 max-w-[320px]">
          <div className="text-center">
            <div className="font-bold uppercase tracking-wide">MUCHO LOCO GYM</div>
            <div>{t('ticket.branch')}: {ticket.branchName}</div>
            <div>{t('ticket.paidAt')}: {formatDateTime(ticket.paidAt, lang)}</div>
          </div>
          <ul className="border-t border-b border-dashed border-ml-border py-2 space-y-1">
            {ticket.lines.map((line, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{line.qty} × {line.description}</span>
                <span>{formatMoney(line.qty * line.unitPrice, lang)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-bold">
            <span>{t('ticket.total')}</span>
            <span>{formatMoney(ticket.total, lang)}</span>
          </div>
          <div>{t(`ticket.method.${ticket.method}`)}</div>

          <div className="border-t border-dashed border-ml-border pt-2" data-self-invoice={invoice?.status}>
            <div className="font-bold">{t('ticket.invoiceTitle')}</div>
            {invoice?.status === 'ready' && invoice.url && (
              <div className="space-y-1">
                <p>{t('ticket.invoiceHowTo')}</p>
                <div className="bg-white p-2 inline-block">
                  <QRCodeSVG value={invoice.url} size={128} />
                </div>
                <div className="break-all">{invoice.url}</div>
                <div>{t('ticket.keyLabel')}: <b>{invoice.key}</b></div>
                {invoice.expiresAt && <div>{t('ticket.validUntil', { date: formatDate(invoice.expiresAt, lang) })}</div>}
              </div>
            )}
            {invoice?.status === 'pending' && <p>{stopped ? t('ticket.pendingStopped') : t('ticket.pending')}</p>}
            {invoice?.status === 'unavailable' && <p>{t('ticket.unavailable')}</p>}
            {invoice?.status === 'invoiced' && <p>{t('ticket.invoiced')}</p>}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4 print:hidden">
        {ticket && (
          <button onClick={() => window.print()} className="px-4 py-2 rounded text-sm font-medium bg-ml-red text-ml-cream">
            {t('ticket.print')}
          </button>
        )}
        {(stopped || error === 'loadError') && (
          <button onClick={refresh} className="px-4 py-2 rounded text-sm font-medium border border-ml-border text-ml-cream-dim">
            {t('ticket.refresh')}
          </button>
        )}
        <button onClick={onClose} className="px-4 py-2 rounded text-sm font-medium border border-ml-border text-ml-cream-dim">
          {t('ticket.close')}
        </button>
      </div>
    </div>
  );
}
