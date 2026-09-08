import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useBranchInventoryStore } from '../lib/stores/branchInventory.store';
import { useInventoryTransfersStore } from '../lib/stores/inventoryTransfers.store';
import { useBranchStatsStore } from '../lib/stores/branchStats.store';
import { inventoryTransferRepository, InsufficientStockError, SameBranchError } from '../lib/repositories/inventoryTransfer.repository';
import { formatDate } from '../lib/dates';
import type { Lang } from '@mucho-loco/types';

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-ml-card border border-ml-border animate-pulse" />
      ))}
    </div>
  );
}

// Stable references so ?? [] doesn't hand out a new array identity every
// render (which would otherwise churn the useMemo/effect below on every
// re-render even when the underlying store data hasn't changed).
const NO_BRANCHES: never[] = [];
const NO_LEVELS: never[] = [];

export function TransfersPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;

  const inventory = useBranchInventoryStore();
  const transfers = useInventoryTransfersStore();
  const branchStats = useBranchStatsStore();
  const { fetch: fetchInventory } = inventory;
  const { fetch: fetchTransfers } = transfers;
  const { fetch: fetchBranchStats } = branchStats;

  useEffect(() => {
    fetchInventory();
    fetchTransfers();
    fetchBranchStats();
  }, [fetchInventory, fetchTransfers, fetchBranchStats]);

  const branches = branchStats.data ?? NO_BRANCHES;
  const levels = inventory.data ?? NO_LEVELS;

  const products = useMemo(() => {
    const byId = new Map<string, string>();
    for (const level of levels) byId.set(level.productId, level.productName);
    return Array.from(byId, ([productId, productName]) => ({ productId, productName }));
  }, [levels]);

  const [productId, setProductId] = useState('');
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [qty, setQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Selects default to the first product / first two branches once the
  // stores load, without stashing that default in state (avoids a
  // setState-in-effect render cascade) — the user's own picks still win
  // over these once made.
  const selectedProductId = productId || products[0]?.productId || '';
  const selectedFromBranchId = fromBranchId || String(branches[0]?.branchId ?? '');
  const selectedToBranchId = toBranchId || String(branches[1]?.branchId ?? branches[0]?.branchId ?? '');

  function branchLabelFor(branchId: number): string {
    return branches.find((b) => b.branchId === branchId)?.branchName ?? `#${branchId}`;
  }

  const availableAtSource = levels.find(
    (l) => l.productId === selectedProductId && String(l.branchId) === selectedFromBranchId
  )?.qty ?? 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const qtyNum = Number(qty);
    if (!selectedProductId || !selectedFromBranchId || !selectedToBranchId || !qtyNum || qtyNum <= 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await inventoryTransferRepository.create({
        productId: selectedProductId,
        fromBranchId: Number(selectedFromBranchId),
        toBranchId: Number(selectedToBranchId),
        qty: qtyNum,
      });
      setQty('');
      await Promise.all([fetchInventory(), fetchTransfers()]);
    } catch (err) {
      if (err instanceof SameBranchError) {
        setSubmitError(t('transfers.errorSameBranch'));
      } else if (err instanceof InsufficientStockError) {
        setSubmitError(t('transfers.errorInsufficientStock', { product: err.productName }));
      } else {
        console.error(err);
        setSubmitError(t('transfers.errorGeneric'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t('transfers.title')}</h1>
        <p className="text-ml-cream-dim text-sm">{t('transfers.subtitle')}</p>
      </div>

      <section>
        <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('transfers.newTransfer')}</h2>
        <form onSubmit={handleSubmit} className="bg-ml-card border border-ml-border rounded p-4 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('transfers.productLabel')}</label>
            <select
              value={selectedProductId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-sm"
            >
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>{p.productName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('transfers.fromBranchLabel')}</label>
            <select
              value={selectedFromBranchId}
              onChange={(e) => setFromBranchId(e.target.value)}
              className="w-full bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-sm"
            >
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>{b.branchName}</option>
              ))}
            </select>
            <p className="text-xs text-ml-cream-dim mt-1">{t('transfers.availableLabel')}: {availableAtSource}</p>
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('transfers.toBranchLabel')}</label>
            <select
              value={selectedToBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
              className="w-full bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-sm"
            >
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>{b.branchName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('transfers.qtyLabel')}</label>
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              type="number"
              min="1"
              step="1"
              placeholder="0"
              className="w-full bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ml-red"
            />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded bg-ml-red text-ml-cream text-sm font-medium hover:bg-ml-red-bright disabled:opacity-40 transition-colors"
            >
              {submitting ? t('transfers.submitting') : t('transfers.submit')}
            </button>
            {submitError && <p className="text-ml-red text-xs">{submitError}</p>}
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('transfers.stockByBranchTitle')}</h2>
        {inventory.error && (
          <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 text-sm">
            {t('transfers.loadError')}: {inventory.error}
          </div>
        )}
        {inventory.loading && !inventory.data ? (
          <TableSkeleton rows={4} />
        ) : (
          inventory.data && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border">
                  <th className="py-2">{t('transfers.branchLabel')}</th>
                  <th className="py-2">{t('transfers.productLabel')}</th>
                  <th className="py-2">{t('transfers.qtyColumnLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((l) => (
                  <tr key={`${l.branchId}-${l.productId}`} className="border-b border-ml-border">
                    <td className="py-2">{branchLabelFor(l.branchId)}</td>
                    <td className="py-2">{l.productName}</td>
                    <td className="py-2 font-medium">{l.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </section>

      <section>
        <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('transfers.historyTitle')}</h2>
        {transfers.error && (
          <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 text-sm">
            {t('transfers.loadError')}: {transfers.error}
          </div>
        )}
        {transfers.loading && !transfers.data ? (
          <TableSkeleton rows={3} />
        ) : transfers.data && transfers.data.length === 0 ? (
          <p className="text-ml-cream-dim text-sm">{t('transfers.emptyState')}</p>
        ) : (
          transfers.data && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border">
                  <th className="py-2">{t('transfers.productLabel')}</th>
                  <th className="py-2">{t('transfers.fromBranchLabel')}</th>
                  <th className="py-2">{t('transfers.toBranchLabel')}</th>
                  <th className="py-2">{t('transfers.qtyColumnLabel')}</th>
                  <th className="py-2">{t('transfers.dateLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {[...transfers.data].reverse().map((tr) => (
                  <tr key={tr.id} className="border-b border-ml-border">
                    <td className="py-2">{tr.productName}</td>
                    <td className="py-2">{tr.fromBranchName}</td>
                    <td className="py-2">{tr.toBranchName}</td>
                    <td className="py-2 font-medium">{tr.qty}</td>
                    <td className="py-2 text-ml-cream-dim">{formatDate(tr.createdAt, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </section>
    </div>
  );
}
