import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBranchStatsStore } from '../lib/stores/branchStats.store';
import { useGlobalInventoryStore } from '../lib/stores/globalInventory.store';

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX')}`;
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-ml-card border border-ml-border animate-pulse" />
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const branchStats = useBranchStatsStore();
  const inventory = useGlobalInventoryStore();
  const { fetch: fetchBranchStats } = branchStats;
  const { fetch: fetchInventory } = inventory;

  useEffect(() => {
    fetchBranchStats();
    fetchInventory();
  }, [fetchBranchStats, fetchInventory]);

  const totalRevenue = (branchStats.data ?? []).reduce((sum, b) => sum + b.revenue, 0);
  const totalCustomers = (branchStats.data ?? []).reduce((sum, b) => sum + b.activeCustomers, 0);
  const totalCheckInsToday = (branchStats.data ?? []).reduce((sum, b) => sum + b.checkInsToday, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t('dashboard.title')}</h1>
        <p className="text-ml-cream-dim text-sm">{t('dashboard.readOnlyNote')}</p>
      </div>

      {branchStats.data && (
        <div className="flex gap-6">
          <div className="bg-ml-card border border-ml-border rounded p-4 flex-1">
            <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t('dashboard.totalRevenue')}</div>
            <div className="text-2xl font-bold text-ml-red">{formatPrice(totalRevenue)}</div>
          </div>
          <div className="bg-ml-card border border-ml-border rounded p-4 flex-1">
            <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t('dashboard.activeCustomers')}</div>
            <div className="text-2xl font-bold text-ml-orange">{totalCustomers}</div>
          </div>
          {/* Spec 014: afluencia, de las entradas que registra cada sucursal. */}
          <div className="bg-ml-card border border-ml-border rounded p-4 flex-1">
            <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t('dashboard.checkInsToday')}</div>
            <div className="text-2xl font-bold text-ml-cream">{totalCheckInsToday}</div>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">
          {t('dashboard.byBranch')}
        </h2>
        {branchStats.error && (
          <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 text-sm">
            {t('dashboard.statsError')}: {branchStats.error}
          </div>
        )}
        {branchStats.loading && !branchStats.data ? (
          <TableSkeleton rows={4} />
        ) : (
          branchStats.data && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border">
                  <th className="py-2">{t('dashboard.branchLabel')}</th>
                  <th className="py-2">{t('dashboard.activeCustomers')}</th>
                  <th className="py-2">{t('dashboard.checkInsToday')}</th>
                  <th className="py-2">{t('dashboard.checkIns')}</th>
                  <th className="py-2">{t('dashboard.revenueLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {branchStats.data.map((b) => (
                  <tr key={b.branchId} className="border-b border-ml-border">
                    <td className="py-2">{b.branchName}</td>
                    <td className="py-2">{b.activeCustomers}</td>
                    <td className="py-2">{b.checkInsToday}</td>
                    <td className="py-2">{b.checkIns}</td>
                    <td className="py-2 font-medium">{formatPrice(b.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </section>

      <section>
        <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">
          {t('dashboard.globalInventory')}
        </h2>
        {inventory.error && (
          <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 text-sm">
            {t('dashboard.inventoryError')}: {inventory.error}
          </div>
        )}
        {inventory.loading && !inventory.data ? (
          <TableSkeleton rows={4} />
        ) : (
          inventory.data && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border">
                  <th className="py-2">{t('dashboard.productLabel')}</th>
                  <th className="py-2">{t('dashboard.totalStockLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {inventory.data.map((item) => (
                  <tr key={item.productId} className="border-b border-ml-border">
                    <td className="py-2">{item.productName}</td>
                    <td className="py-2 font-medium">{item.totalQty}</td>
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
