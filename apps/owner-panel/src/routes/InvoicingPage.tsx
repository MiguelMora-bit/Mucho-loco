import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Cfdi, CfdiCancellationMotive, InvoicingSummary, Lang } from '@mucho-loco/types';
import {
  CancellationRejectedError,
  CfdiAlreadyCanceledError,
  invoicingRepository,
  InvoicingUnavailableError,
  type CfdiFile,
} from '../lib/repositories/invoicing.repository';
import { cfdisToCsv } from '../lib/cfdiCsv';
import { currentMonth } from '../lib/currentMonth';

const MOTIVES: CfdiCancellationMotive[] = ['02', '03'];
const SUMMARY_KEYS = ['pending', 'open', 'invoicedToCustomer', 'invoicedGlobally', 'canceled', 'failed'] as const;

function formatMoney(amount: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(amount);
}

function formatInstant(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/** Descarga un archivo en el navegador (Blob + <a download>). */
function save(data: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

type Notice = { kind: 'ok' | 'error'; text: string; detail?: string } | null;

/**
 * Facturas de HQ (spec 004): los CFDI del mes, buscar el folio que un socio
 * reportó por WhatsApp, descargar, cancelar con motivo del SAT, ver cuántos
 * recibos fallaron y exportar el mes para el contador.
 */
export function InvoicingPage() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith('en') ? 'en' : 'es';

  const [month, setMonth] = useState(() => currentMonth());
  const [cfdis, setCfdis] = useState<Cfdi[] | null>(null);
  const [summary, setSummary] = useState<InvoicingSummary | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [canceling, setCanceling] = useState<Cfdi | null>(null);
  const [motive, setMotive] = useState<CfdiCancellationMotive>('02');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  // Se incrementa para volver a pedir (reintentar, después de cancelar).
  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([invoicingRepository.listCfdis(month), invoicingRepository.getSummary()]).then(
      ([list, counts]) => {
        if (cancelled) return;
        setCfdis(list);
        setSummary(counts);
        setLoadError(false);
      },
      (e: unknown) => {
        console.error(e);
        if (!cancelled) setLoadError(true);
      },
    );
    // Si cambia el mes antes de que conteste, la respuesta vieja se descarta.
    return () => {
      cancelled = true;
    };
  }, [month, reloadKey]);

  const visible = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!cfdis || !q) return cfdis ?? [];
    return cfdis.filter((c) => [c.uuid, c.customerTaxId, c.customerLegalName].some((v) => v.toUpperCase().includes(q)));
  }, [cfdis, query]);

  async function download(cfdi: Cfdi, format: 'pdf' | 'xml') {
    try {
      const file: CfdiFile = await invoicingRepository.download(cfdi.id, format);
      save(file.data as BlobPart, file.contentType, file.filename);
    } catch (e) {
      console.error(e);
      setNotice({ kind: 'error', text: e instanceof InvoicingUnavailableError ? t('invoicing.errors.unavailable') : t('invoicing.errors.generic') });
    }
  }

  async function confirmCancel() {
    if (!canceling) return;
    setBusy(true);
    setNotice(null);
    try {
      await invoicingRepository.cancel(canceling.id, motive);
      setNotice({ kind: 'ok', text: t('invoicing.canceled') });
      setCanceling(null);
      load();
    } catch (e) {
      if (e instanceof CancellationRejectedError) {
        setNotice({ kind: 'error', text: t('invoicing.errors.rejected'), detail: e.detail });
      } else if (e instanceof CfdiAlreadyCanceledError) {
        setNotice({ kind: 'error', text: t('invoicing.errors.already') });
        setCanceling(null);
        load();
      } else if (e instanceof InvoicingUnavailableError) {
        setNotice({ kind: 'error', text: t('invoicing.errors.unavailable') });
      } else {
        console.error(e);
        setNotice({ kind: 'error', text: t('invoicing.errors.generic') });
      }
    } finally {
      setBusy(false);
    }
  }

  const buttonClass = 'px-3 py-1.5 rounded text-xs font-medium border border-ml-border text-ml-cream-dim hover:text-ml-cream';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t('invoicing.title')}</h1>
        <p className="text-ml-cream-dim text-sm">{t('invoicing.subtitle')}</p>
      </header>

      {summary && (
        <section aria-label={t('invoicing.summary.title')}>
          <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('invoicing.summary.title')}</h2>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {SUMMARY_KEYS.map((key) => {
              const alert = key === 'failed' && summary.receipts.failed > 0;
              return (
                <div key={key} data-summary={key} className={'rounded p-3 border ' + (alert ? 'border-ml-red bg-ml-red/10' : 'border-ml-border bg-ml-card')}>
                  <div className={'text-2xl font-bold ' + (alert ? 'text-ml-red-bright' : '')}>{summary.receipts[key]}</div>
                  <div className="text-xs text-ml-cream-dim">{t(`invoicing.summary.${key}`)}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs text-ml-cream-dim mb-1">{t('invoicing.month')}</span>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="bg-ml-card border border-ml-border rounded px-3 py-2" />
        </label>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('invoicing.search')}
          aria-label={t('invoicing.search')}
          className="flex-1 min-w-[240px] bg-ml-card border border-ml-border rounded px-3 py-2 text-sm"
        />
        <button
          onClick={() => cfdis && save(cfdisToCsv(cfdis, lang), 'text/csv;charset=utf-8', `facturas-${month}.csv`)}
          disabled={!cfdis || cfdis.length === 0}
          className="px-4 py-2 rounded bg-ml-red text-ml-cream text-sm font-medium disabled:opacity-40"
        >
          {t('invoicing.export')}
        </button>
      </div>

      {notice && (
        <div role={notice.kind === 'error' ? 'alert' : 'status'} className={'rounded p-3 text-sm border ' + (notice.kind === 'error' ? 'border-ml-red text-ml-red-bright' : 'border-ml-green text-ml-green')}>
          {notice.text} {notice.detail && <span className="text-ml-cream">{notice.detail}</span>}
        </div>
      )}

      {canceling && (
        <div role="dialog" aria-labelledby="cancel-title" className="bg-ml-card border border-ml-red rounded p-4 space-y-3">
          <h2 id="cancel-title" className="font-bold">{t('invoicing.cancelTitle')} · <span className="font-mono text-sm">{canceling.uuid}</span></h2>
          <p className="text-sm text-ml-cream-dim">{canceling.customerLegalName} · {formatMoney(canceling.total, lang)}</p>
          <fieldset className="space-y-2">
            <legend className="text-xs text-ml-cream-dim mb-1">{t('invoicing.cancelMotive')}</legend>
            {MOTIVES.map((m) => (
              <label key={m} className="flex items-start gap-2 text-sm">
                <input type="radio" name="motive" value={m} checked={motive === m} onChange={() => setMotive(m)} />
                <span>{t(`invoicing.motive.${m}`)}</span>
              </label>
            ))}
          </fieldset>
          <div className="flex gap-2">
            <button onClick={confirmCancel} disabled={busy} className="px-4 py-2 rounded bg-ml-red text-ml-cream text-sm font-medium disabled:opacity-40">
              {busy ? t('invoicing.canceling') : t('invoicing.cancelConfirm')}
            </button>
            <button onClick={() => setCanceling(null)} disabled={busy} className={buttonClass}>{t('invoicing.cancelBack')}</button>
          </div>
        </div>
      )}

      {loadError && (
        <div role="alert" className="text-sm text-ml-red-bright">
          {t('invoicing.loadError')} <button onClick={load} className="underline">{t('invoicing.refresh')}</button>
        </div>
      )}

      {cfdis && visible.length === 0 && !loadError && <p className="text-ml-cream-dim text-sm">{t('invoicing.empty')}</p>}

      {visible.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-ml-cream-dim uppercase">
            <tr>
              <th className="py-2">{t('invoicing.columns.uuid')}</th>
              <th>{t('invoicing.columns.kind')}</th>
              <th>{t('invoicing.columns.issuedAt')}</th>
              <th>{t('invoicing.columns.customer')}</th>
              <th className="text-right">{t('invoicing.columns.total')}</th>
              <th>{t('invoicing.columns.status')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id} data-cfdi={c.uuid} className="border-t border-ml-border align-top">
                <td className="py-2 font-mono text-xs break-all max-w-[220px]">{c.uuid}</td>
                <td>{t(`invoicing.kind.${c.kind}`)}</td>
                <td className="whitespace-nowrap">{formatInstant(c.issuedAt, lang)}</td>
                <td>
                  <div>{c.customerLegalName}</div>
                  <div className="text-xs text-ml-cream-dim font-mono">{c.customerTaxId}</div>
                </td>
                <td className="text-right whitespace-nowrap">{formatMoney(c.total, lang)}</td>
                <td>
                  <span className={c.status === 'canceled' ? 'text-ml-red-bright' : 'text-ml-green'}>{t(`invoicing.status.${c.status}`)}</span>
                  {c.status === 'valid' && c.cancellationStatus === 'pending' && (
                    <div className="text-xs text-ml-cream-dim">{t('invoicing.cancellationPending')}</div>
                  )}
                </td>
                <td className="whitespace-nowrap space-x-1 text-right">
                  <button onClick={() => void download(c, 'pdf')} className={buttonClass}>PDF</button>
                  <button onClick={() => void download(c, 'xml')} className={buttonClass}>XML</button>
                  {c.status === 'valid' && c.cancellationStatus !== 'pending' && (
                    <button onClick={() => { setNotice(null); setMotive('02'); setCanceling(c); }} className={buttonClass}>
                      {t('invoicing.cancel')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
