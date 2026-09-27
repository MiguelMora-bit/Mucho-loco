import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCashRegisterShiftStore } from '../lib/stores/cashRegisterShift.store';
import {
  cashRegisterShiftRepository,
  ShiftAlreadyClosedError,
} from '../lib/repositories/cashRegisterShift.repository';
import { calculateShiftTotals, cashDifference } from '../lib/cashRegister';
import type { CashRegisterShift, PaymentMethod, ShiftTransaction } from '@mucho-loco/types';
import { formatDateTime, langOf } from '../lib/dates';
import { getCurrentBranchId } from '../lib/currentBranch';
import { CounterTicket } from '../components/CounterTicket';

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX')}`;
}

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'transfer'];

/** Arqueo (spec 052): faltante en rojo, sobrante en naranja, cuadrado en verde. */
function CountDifference({ difference }: { difference: number }) {
  const { t } = useTranslation();
  if (difference === 0) return <span className="text-ml-green">{t('cashRegister.count.balanced')}</span>;
  if (difference < 0) {
    return <span className="text-ml-red">{t('cashRegister.count.short', { amount: formatPrice(-difference) })}</span>;
  }
  return <span className="text-ml-orange">{t('cashRegister.count.over', { amount: formatPrice(difference) })}</span>;
}

function TotalsGrid({ totals, transactionCount }: { totals: Record<PaymentMethod, number>; transactionCount: number }) {
  const { t } = useTranslation();
  const grandTotal = PAYMENT_METHODS.reduce((sum, m) => sum + totals[m], 0);

  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      {PAYMENT_METHODS.map((method) => (
        <div key={method} className="bg-ml-card border border-ml-border rounded p-3">
          <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t(`cashRegister.totals.${method}`)}</div>
          <div className="text-lg font-bold">{formatPrice(totals[method])}</div>
        </div>
      ))}
      <div className="bg-ml-red/10 border border-ml-red rounded p-3">
        <div className="text-xs font-mono uppercase text-ml-red mb-1">{t('cashRegister.totals.grandTotal')}</div>
        <div className="text-lg font-bold text-ml-red">{formatPrice(grandTotal)}</div>
      </div>
      <div className="col-span-4 text-xs text-ml-cream-dim font-mono">
        {t('cashRegister.transactionCount')}: {transactionCount}
      </div>
    </div>
  );
}

function TransactionList({ transactions }: { transactions: ShiftTransaction[] }) {
  const { t, i18n } = useTranslation();
  const lang = langOf(i18n.language);
  // Reimprimir el ticket de un cobro de mostrador del turno (spec 003, US2).
  const [ticketOf, setTicketOf] = useState<ShiftTransaction | null>(null);
  if (transactions.length === 0) return <p className="text-ml-muted text-sm">{t('cashRegister.noTransactions')}</p>;

  return (
    <>
    {ticketOf && (ticketOf.kind === 'sale' || ticketOf.kind === 'membership') && (
      <CounterTicket kind={ticketOf.kind} sourceId={ticketOf.id} branchId={getCurrentBranchId()} onClose={() => setTicketOf(null)} />
    )}
    <ul className="space-y-2">
      {transactions.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between bg-ml-card border border-ml-border rounded p-3 text-sm">
          <div>
            <span className="px-1.5 py-0.5 rounded text-xs font-mono uppercase bg-ml-card-2 border border-ml-border mr-2">
              {t(`cashRegister.source.${tx.kind}`)}
            </span>
            <span>{tx.description}</span>
            <span className="text-ml-cream-dim ml-2 text-xs">{formatDateTime(tx.createdAt, lang)}</span>
          </div>
          <span className="flex items-center gap-3">
            {tx.kind !== 'pickup' && (
              <button onClick={() => setTicketOf(tx)} className="text-xs underline text-ml-cream-dim">
                {t('ticket.view')}
              </button>
            )}
            <span className="font-medium">{formatPrice(tx.amount)}</span>
          </span>
        </li>
      ))}
    </ul>
    </>
  );
}

function ShiftHistoryRow({ shift }: { shift: CashRegisterShift }) {
  const { t, i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const [expanded, setExpanded] = useState(false);
  const [transactions, setTransactions] = useState<ShiftTransaction[] | null>(null);

  async function toggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!transactions) {
      setTransactions(await cashRegisterShiftRepository.getTransactions(shift.id));
    }
    setExpanded(true);
  }

  const totals = transactions ? calculateShiftTotals(transactions) : null;
  const difference = cashDifference(shift.countedCash, shift.expectedCash);

  return (
    <div className="bg-ml-card border border-ml-border rounded p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm space-y-1">
          <div>
            <span className="text-ml-cream-dim">{t('cashRegister.history.openedAt')}:</span> {formatDateTime(shift.openedAt, lang)}
            {' · '}
            <span className="text-ml-cream-dim">{t('cashRegister.history.closedAt')}:</span> {shift.closedAt ? formatDateTime(shift.closedAt, lang) : '—'}
          </div>
          {shift.countedCash !== null && difference !== null && (
            <div className="text-xs">
              {t('cashRegister.count.counted', { amount: formatPrice(shift.countedCash) })}
              {' · '}
              <CountDifference difference={difference} />
              {shift.closedBy && <span className="text-ml-cream-dim">{' · '}{t('cashRegister.count.closedBy', { name: shift.closedBy })}</span>}
            </div>
          )}
        </div>
        <button onClick={toggle} className="text-xs text-ml-cream-dim hover:text-ml-cream underline">
          {expanded ? t('cashRegister.history.hideDetail') : t('cashRegister.history.viewDetail')}
        </button>
      </div>
      {expanded && totals && transactions && (
        <div className="mt-3 pt-3 border-t border-ml-border">
          <TotalsGrid totals={totals.totals} transactionCount={totals.transactionCount} />
          <TransactionList transactions={transactions} />
        </div>
      )}
    </div>
  );
}

export function CashRegisterPage() {
  const { t, i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const { data, loading, error, fetch } = useCashRegisterShiftStore();
  // Cerrar es arquear (spec 052): el gerente escribe el efectivo que contó.
  const [counting, setCounting] = useState(false);
  const [counted, setCounted] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const countedCash = /^\d+$/.test(counted.trim()) ? Number(counted.trim()) : null;
  const expectedCash = data ? calculateShiftTotals(data.transactions).totals.cash : 0;
  const difference = cashDifference(countedCash, expectedCash);

  function cancelCount() {
    setCounting(false);
    setCounted('');
  }

  async function handleClose() {
    if (!data || countedCash === null) return;
    setClosing(true);
    setCloseError(null);
    try {
      await cashRegisterShiftRepository.closeShift(data.shift.id, countedCash);
      cancelCount();
      await fetch();
    } catch (err) {
      console.error(err);
      if (err instanceof ShiftAlreadyClosedError) {
        setCloseError(t('cashRegister.count.alreadyClosed'));
        cancelCount();
        await fetch();
      } else {
        setCloseError(t('cashRegister.count.error'));
      }
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('cashRegister.title')}</h1>

      {error && (
        <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 mb-4 text-sm">
          {t('cashRegister.loadError')}: {error}
        </div>
      )}

      {loading && !data && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded bg-ml-card border border-ml-border animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim">
                {t('cashRegister.openedLabel')} {formatDateTime(data.shift.openedAt, lang)}
              </h2>
              {!counting && (
                <button
                  onClick={() => setCounting(true)}
                  className="px-4 py-2 rounded text-sm font-medium transition-colors bg-ml-red text-ml-cream hover:bg-ml-red-bright"
                >
                  {t('cashRegister.closeButton')}
                </button>
              )}
            </div>

            {counting && (
              <div className="bg-ml-card border border-ml-orange rounded p-4 mb-4 space-y-3">
                <label htmlFor="counted-cash" className="block text-xs font-mono uppercase text-ml-cream-dim">
                  {t('cashRegister.count.label')}
                </label>
                <input
                  id="counted-cash"
                  inputMode="numeric"
                  autoFocus
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                  placeholder="0"
                  className="w-48 bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-lg focus:outline-none focus:border-ml-orange"
                />
                <p className="text-xs text-ml-cream-dim">{t('cashRegister.count.hint')}</p>
                <p className="text-sm">
                  {t('cashRegister.count.expected', { amount: formatPrice(expectedCash) })}
                  {difference !== null && (
                    <>
                      {' · '}
                      <CountDifference difference={difference} />
                    </>
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleClose}
                    disabled={closing || countedCash === null}
                    className="px-4 py-2 rounded text-sm font-medium bg-ml-orange text-ml-black disabled:opacity-40"
                  >
                    {closing ? t('cashRegister.closing') : t('cashRegister.count.confirm')}
                  </button>
                  <button onClick={cancelCount} disabled={closing} className="px-4 py-2 rounded text-sm text-ml-cream-dim underline">
                    {t('cashRegister.count.cancel')}
                  </button>
                </div>
              </div>
            )}
            {closeError && <p className="text-ml-red text-sm mb-4">{closeError}</p>}

            <TotalsGrid totals={calculateShiftTotals(data.transactions).totals} transactionCount={data.transactions.length} />
            <TransactionList transactions={data.transactions} />
          </section>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('cashRegister.history.title')}</h2>
            {data.history.length === 0 ? (
              <p className="text-ml-muted text-sm">{t('cashRegister.history.empty')}</p>
            ) : (
              <div className="space-y-2">
                {data.history.map((shift) => (
                  <ShiftHistoryRow key={shift.id} shift={shift} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
