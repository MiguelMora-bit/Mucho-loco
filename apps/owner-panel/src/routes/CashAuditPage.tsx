import { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CashShiftAudit, Lang, ShiftTransaction } from '@mucho-loco/types';
import { cashAuditRepository } from '../lib/repositories/cashAudit.repository';
import { useBranchStatsStore } from '../lib/stores/branchStats.store';
import { summarizeCashAudit } from '../lib/cashAudit';
import { currentMonth } from '../lib/currentMonth';
import { formatDateTime } from '../lib/dates';

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX')}`;
}

function Difference({ value }: { value: number | null }) {
  const { t } = useTranslation();
  if (value === null) return <span className="text-ml-muted">{t('cashAudit.noCount')}</span>;
  if (value === 0) return <span className="text-ml-green">{t('cashAudit.balanced')}</span>;
  if (value < 0) return <span className="text-ml-red font-medium">−{formatPrice(-value)}</span>;
  return <span className="text-ml-orange font-medium">+{formatPrice(value)}</span>;
}

function Detail({ transactions, lang }: { transactions: ShiftTransaction[]; lang: Lang }) {
  const { t } = useTranslation();
  if (transactions.length === 0) return <p className="text-ml-muted text-sm">{t('cashAudit.noTransactions')}</p>;
  return (
    <ul className="space-y-1 text-sm">
      {transactions.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between gap-4">
          <span>
            <span className="px-1.5 py-0.5 rounded text-xs font-mono uppercase bg-ml-card-2 border border-ml-border mr-2">
              {t(`cashAudit.source.${tx.kind}`)}
            </span>
            {tx.description}
            <span className="text-ml-cream-dim ml-2 text-xs">{formatDateTime(tx.createdAt, lang)}</span>
          </span>
          <span className="whitespace-nowrap">
            <span className="text-ml-cream-dim text-xs mr-2">{t(`cashAudit.methods.${tx.paymentMethod}`)}</span>
            {formatPrice(tx.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Cortes de caja (spec 052): el arqueo de cada turno cerrado en las 15
 * sucursales — lo que el gerente contó contra el efectivo que el corte dice
 * que entró. La diferencia la calcula el backend al cerrar.
 */
export function CashAuditPage() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith('en') ? 'en' : 'es';

  const branchStats = useBranchStatsStore();
  const { fetch: fetchBranches } = branchStats;
  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const [month, setMonth] = useState(() => currentMonth());
  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const [shifts, setShifts] = useState<CashShiftAudit[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ShiftTransaction[] | 'error'>>({});

  useEffect(() => {
    let cancelled = false;
    cashAuditRepository.getShifts(month, branchId).then(
      (list) => {
        if (cancelled) return;
        setShifts(list);
        setLoadError(false);
      },
      (e: unknown) => {
        console.error(e);
        if (!cancelled) setLoadError(true);
      },
    );
    // Si cambia el filtro antes de que conteste, la respuesta vieja se descarta.
    return () => {
      cancelled = true;
    };
  }, [month, branchId]);

  async function toggle(shiftId: string) {
    if (expandedId === shiftId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(shiftId);
    if (details[shiftId] && details[shiftId] !== 'error') return;
    try {
      const list = await cashAuditRepository.getTransactions(shiftId);
      setDetails((d) => ({ ...d, [shiftId]: list }));
    } catch (e) {
      console.error(e);
      setDetails((d) => ({ ...d, [shiftId]: 'error' }));
    }
  }

  const summary = shifts ? summarizeCashAudit(shifts) : null;
  const branches = branchStats.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t('cashAudit.title')}</h1>
        <p className="text-ml-cream-dim text-sm max-w-3xl">{t('cashAudit.subtitle')}</p>
      </header>

      <div className="flex items-end gap-4 flex-wrap">
        <label className="text-sm">
          <span className="block text-xs text-ml-cream-dim mb-1">{t('cashAudit.month')}</span>
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="bg-ml-card border border-ml-border rounded px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-ml-cream-dim mb-1">{t('cashAudit.branch')}</span>
          <select
            value={branchId ?? ''}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-ml-card border border-ml-border rounded px-3 py-2"
          >
            <option value="">{t('cashAudit.allBranches')}</option>
            {branches.map((b) => (
              <option key={b.branchId} value={b.branchId}>{b.branchName}</option>
            ))}
          </select>
        </label>
      </div>

      {loadError && (
        <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 text-sm">{t('cashAudit.loadError')}</div>
      )}

      {summary && (
        <section aria-label={t('cashAudit.title')} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded p-3 border border-ml-border bg-ml-card">
            <div className="text-2xl font-bold">{summary.shifts}</div>
            <div className="text-xs text-ml-cream-dim">{t('cashAudit.summary.shifts')}</div>
          </div>
          <div className={'rounded p-3 border ' + (summary.shortage > 0 ? 'border-ml-red bg-ml-red/10' : 'border-ml-border bg-ml-card')}>
            <div className={'text-2xl font-bold ' + (summary.shortage > 0 ? 'text-ml-red-bright' : '')}>{formatPrice(summary.shortage)}</div>
            <div className="text-xs text-ml-cream-dim">{t('cashAudit.summary.shortage')}</div>
          </div>
          <div className="rounded p-3 border border-ml-border bg-ml-card">
            <div className={'text-2xl font-bold ' + (summary.overage > 0 ? 'text-ml-orange' : '')}>{formatPrice(summary.overage)}</div>
            <div className="text-xs text-ml-cream-dim">{t('cashAudit.summary.overage')}</div>
          </div>
          <div className="rounded p-3 border border-ml-border bg-ml-card">
            <div className="text-2xl font-bold">{summary.uncounted}</div>
            <div className="text-xs text-ml-cream-dim">{t('cashAudit.summary.uncounted')}</div>
          </div>
        </section>
      )}

      {!shifts && !loadError ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded bg-ml-card border border-ml-border animate-pulse" />
          ))}
        </div>
      ) : shifts && shifts.length === 0 ? (
        <p className="text-ml-muted text-sm">{t('cashAudit.empty')}</p>
      ) : shifts ? (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border">
              <th className="py-2">{t('cashAudit.columns.branch')}</th>
              <th className="py-2">{t('cashAudit.columns.closedAt')}</th>
              <th className="py-2">{t('cashAudit.columns.closedBy')}</th>
              <th className="py-2 text-right">{t('cashAudit.columns.expected')}</th>
              <th className="py-2 text-right">{t('cashAudit.columns.counted')}</th>
              <th className="py-2 text-right">{t('cashAudit.columns.difference')}</th>
              <th className="py-2 text-right">{t('cashAudit.columns.card')}</th>
              <th className="py-2 text-right">{t('cashAudit.columns.transfer')}</th>
              <th className="py-2 text-right">{t('cashAudit.columns.count')}</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => {
              const detail = details[s.id];
              return (
                <Fragment key={s.id}>
                  <tr className="border-b border-ml-border" data-shift={s.id}>
                    <td className="py-2">{s.branchName}</td>
                    <td className="py-2 whitespace-nowrap">{formatDateTime(s.closedAt, lang)}</td>
                    <td className="py-2">{s.closedBy ?? '—'}</td>
                    <td className="py-2 text-right">{s.totals ? formatPrice(s.totals.cash) : '—'}</td>
                    <td className="py-2 text-right">{s.countedCash === null ? '—' : formatPrice(s.countedCash)}</td>
                    <td className="py-2 text-right"><Difference value={s.difference} /></td>
                    <td className="py-2 text-right">{s.totals ? formatPrice(s.totals.card) : '—'}</td>
                    <td className="py-2 text-right">{s.totals ? formatPrice(s.totals.transfer) : '—'}</td>
                    <td className="py-2 text-right">{s.transactionCount ?? '—'}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => toggle(s.id)} className="text-xs font-mono text-ml-cream-dim hover:text-ml-cream underline">
                        {expandedId === s.id ? t('cashAudit.hideDetail') : t('cashAudit.viewDetail')}
                      </button>
                    </td>
                  </tr>
                  {expandedId === s.id && (
                    <tr className="border-b border-ml-border">
                      <td colSpan={10} className="py-3">
                        <div className="bg-ml-card-2 border border-ml-border rounded p-4 space-y-2">
                          <div className="text-xs text-ml-cream-dim">
                            {t('cashAudit.openedAt', { date: formatDateTime(s.openedAt, lang) })}
                            {s.closedByEmail && ` · ${s.closedByEmail}`}
                          </div>
                          {detail === 'error' ? (
                            <p className="text-ml-red text-sm">{t('cashAudit.detailError')}</p>
                          ) : detail ? (
                            <Detail transactions={detail} lang={lang} />
                          ) : (
                            <div className="h-6 rounded bg-ml-card border border-ml-border animate-pulse" />
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
