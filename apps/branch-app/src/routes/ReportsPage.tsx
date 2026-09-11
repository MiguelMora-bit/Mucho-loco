import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBranchInventoryStore } from '../lib/stores/branchInventory.store';
import { useSalesReportStore, REPORT_WINDOW_DAYS } from '../lib/stores/salesReport.store';
import { isLowStock } from '../lib/reports';

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX')}`;
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
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

export function ReportsPage() {
  const { t } = useTranslation();
  const salesReport = useSalesReportStore();
  const inventory = useBranchInventoryStore();
  const { fetch: fetchSalesReport } = salesReport;
  const { fetch: fetchInventory } = inventory;

  useEffect(() => {
    fetchSalesReport();
    fetchInventory();
  }, [fetchSalesReport, fetchInventory]);

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t('reports.title')}</h1>
        <p className="text-ml-cream-dim text-sm">{t('reports.subtitle', { days: REPORT_WINDOW_DAYS })}</p>
      </div>

      {salesReport.error && (
        <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 text-sm">
          {t('reports.loadError')}: {salesReport.error}
        </div>
      )}

      {salesReport.loading && !salesReport.data && (
        <div className="flex gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 rounded bg-ml-card border border-ml-border animate-pulse flex-1" />
          ))}
        </div>
      )}

      {salesReport.data && (
        <div className="flex gap-6">
          <div className="bg-ml-card border border-ml-border rounded p-4 flex-1">
            <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t('reports.totalRevenue')}</div>
            <div className="text-2xl font-bold text-ml-red">{formatPrice(salesReport.data.totalRevenue)}</div>
          </div>
          <div className="bg-ml-card border border-ml-border rounded p-4 flex-1">
            <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t('reports.transactionCount')}</div>
            <div className="text-2xl font-bold text-ml-orange">{salesReport.data.transactionCount}</div>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('reports.byDay')}</h2>
        {salesReport.data && (
          salesReport.data.byDay.length === 0 ? (
            <p className="text-ml-muted text-sm">{t('reports.noSales')}</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border">
                  <th className="py-2">{t('reports.dateLabel')}</th>
                  <th className="py-2">{t('reports.revenueLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {salesReport.data.byDay.map((d) => (
                  <tr key={d.date} className="border-b border-ml-border">
                    <td className="py-2">{formatDate(d.date)}</td>
                    <td className="py-2 font-medium">{formatPrice(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </section>

      <section>
        <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('reports.topProducts')}</h2>
        {salesReport.data && (
          salesReport.data.topProducts.length === 0 ? (
            <p className="text-ml-muted text-sm">{t('reports.noSales')}</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border">
                  <th className="py-2">{t('reports.productLabel')}</th>
                  <th className="py-2">{t('reports.qtySoldLabel')}</th>
                  <th className="py-2">{t('reports.revenueLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {salesReport.data.topProducts.map((p) => (
                  <tr key={p.productId} className="border-b border-ml-border">
                    <td className="py-2">{p.productName}</td>
                    <td className="py-2">{p.qtySold}</td>
                    <td className="py-2 font-medium">{formatPrice(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </section>

      <section>
        <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('reports.localInventory')}</h2>
        {inventory.error && (
          <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 text-sm">
            {t('reports.loadError')}: {inventory.error}
          </div>
        )}
        {inventory.loading && !inventory.data ? (
          <TableSkeleton rows={4} />
        ) : (
          inventory.data && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border">
                  <th className="py-2">{t('reports.productLabel')}</th>
                  <th className="py-2">{t('reports.stockLabel')}</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {inventory.data.map((item) => (
                  <tr key={item.productId} className="border-b border-ml-border">
                    <td className="py-2">{item.productName}</td>
                    <td className="py-2 font-medium">{item.qty}</td>
                    <td className="py-2">
                      {isLowStock(item) && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-mono uppercase bg-ml-red/10 border border-ml-red text-ml-red">
                          {t('reports.lowStock')}
                        </span>
                      )}
                    </td>
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
