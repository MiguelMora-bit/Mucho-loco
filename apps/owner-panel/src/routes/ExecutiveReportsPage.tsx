import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useExecutiveReportStore } from '../lib/stores/executiveReport.store';

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX')}`;
}

export function ExecutiveReportsPage() {
  const { t } = useTranslation();
  const { data, loading, error, fetch } = useExecutiveReportStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t('executiveReports.title')}</h1>
        <p className="text-ml-cream-dim text-sm">{t('executiveReports.subtitle')}</p>
      </div>

      {error && (
        <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 text-sm">
          {t('executiveReports.loadError')}: {error}
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded bg-ml-card border border-ml-border animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-ml-card border border-ml-border rounded p-4">
              <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t('executiveReports.totalRevenue')}</div>
              <div className="text-xl font-bold text-ml-red">{formatPrice(data.totalRevenue)}</div>
            </div>
            <div className="bg-ml-card border border-ml-border rounded p-4">
              <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t('executiveReports.totalExpenses')}</div>
              <div className="text-xl font-bold text-ml-orange">{formatPrice(data.totalExpenses)}</div>
            </div>
            <div className="bg-ml-card border border-ml-border rounded p-4">
              <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t('executiveReports.totalPayrollCost')}</div>
              <div className="text-xl font-bold text-ml-orange">{formatPrice(data.totalPayrollCost)}</div>
            </div>
            <div className="bg-ml-card border border-ml-border rounded p-4">
              <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t('executiveReports.totalNetProfit')}</div>
              <div className={'text-xl font-bold ' + (data.totalNetProfit >= 0 ? 'text-ml-green' : 'text-ml-red')}>
                {formatPrice(data.totalNetProfit)}
              </div>
            </div>
          </div>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('executiveReports.byBranch')}</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border">
                  <th className="py-2">{t('executiveReports.branchLabel')}</th>
                  <th className="py-2">{t('executiveReports.revenueLabel')}</th>
                  <th className="py-2">{t('executiveReports.expensesLabel')}</th>
                  <th className="py-2">{t('executiveReports.payrollCostLabel')}</th>
                  <th className="py-2">{t('executiveReports.netProfitLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {data.branches.map((b) => (
                  <tr key={b.branchId} className="border-b border-ml-border">
                    <td className="py-2">{b.branchName}</td>
                    <td className="py-2">{formatPrice(b.revenue)}</td>
                    <td className="py-2">{formatPrice(b.expenses)}</td>
                    <td className="py-2">{formatPrice(b.payrollCost)}</td>
                    <td className={'py-2 font-medium ' + (b.netProfit >= 0 ? 'text-ml-green' : 'text-ml-red')}>
                      {formatPrice(b.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('executiveReports.expensesByCategory')}</h2>
            <table className="w-full text-sm border-collapse mb-3">
              <thead>
                <tr className="text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border">
                  <th className="py-2">{t('executiveReports.categoryLabel')}</th>
                  <th className="py-2">{t('executiveReports.totalLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {data.expensesByCategory.map((c) => (
                  <tr key={c.category} className="border-b border-ml-border">
                    <td className="py-2">{t(`expenses.categories.${c.category}`)}</td>
                    <td className="py-2 font-medium">{formatPrice(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-ml-cream-dim">
              {t('executiveReports.corporateExpensesNote')} {formatPrice(data.corporateExpenses)}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
