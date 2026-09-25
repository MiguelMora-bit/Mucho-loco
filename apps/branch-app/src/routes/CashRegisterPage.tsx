import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCashRegisterShiftStore } from '../lib/stores/cashRegisterShift.store';
import { cashRegisterShiftRepository } from '../lib/repositories/cashRegisterShift.repository';
import { calculateShiftTotals } from '../lib/cashRegister';
import type { CashRegisterShift, PaymentMethod, ShiftTransaction } from '@mucho-loco/types';
import { formatDateTime, langOf } from '../lib/dates';
import { getCurrentBranchId } from '../lib/currentBranch';
import { CounterTicket } from '../components/CounterTicket';

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX')}`;
}

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'transfer'];

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

  return (
    <div className="bg-ml-card border border-ml-border rounded p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-ml-cream-dim">{t('cashRegister.history.openedAt')}:</span> {formatDateTime(shift.openedAt, lang)}
          {' · '}
          <span className="text-ml-cream-dim">{t('cashRegister.history.closedAt')}:</span> {shift.closedAt ? formatDateTime(shift.closedAt, lang) : '—'}
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
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    fetch();
  }, [fetch]);

  async function handleClose() {
    if (!data) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setClosing(true);
    try {
      await cashRegisterShiftRepository.closeShift(data.shift.id);
      setConfirming(false);
      await fetch();
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
              <button
                onClick={handleClose}
                disabled={closing}
                className={
                  'px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-40 ' +
                  (confirming ? 'bg-ml-orange text-ml-black' : 'bg-ml-red text-ml-cream hover:bg-ml-red-bright')
                }
              >
                {closing ? t('cashRegister.closing') : confirming ? t('cashRegister.closeConfirm') : t('cashRegister.closeButton')}
              </button>
            </div>

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
