import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useExpensesStore } from '../lib/stores/expenses.store';
import { useBranchStatsStore } from '../lib/stores/branchStats.store';
import { expensesRepository } from '../lib/repositories/expenses.repository';
import { formatDate } from '../lib/dates';
import type { ExpenseCategory, Lang } from '@mucho-loco/types';

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX')}`;
}

const CATEGORIES: ExpenseCategory[] = ['rent', 'utilities', 'maintenance', 'supplies', 'marketing', 'other'];
const CORPORATE_VALUE = 'corporate';

export function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { data, loading, error, fetch } = useExpensesStore();
  const branchStats = useBranchStatsStore();
  const { fetch: fetchBranchStats } = branchStats;

  useEffect(() => {
    fetch();
    fetchBranchStats();
  }, [fetch, fetchBranchStats]);

  const [branchValue, setBranchValue] = useState<string>(CORPORATE_VALUE);
  const [category, setCategory] = useState<ExpenseCategory>('rent');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const expenses = data ?? [];
  const branches = branchStats.data ?? [];
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  function branchLabelFor(branchId: number | null): string {
    if (branchId === null) return t('expenses.corporate');
    return branches.find((b) => b.branchId === branchId)?.branchName ?? `#${branchId}`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!description.trim() || !amountNum || amountNum <= 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await expensesRepository.create({
        branchId: branchValue === CORPORATE_VALUE ? null : Number(branchValue),
        category,
        description: description.trim(),
        amount: amountNum,
      });
      setDescription('');
      setAmount('');
      await fetch();
    } catch (err) {
      console.error(err);
      setSubmitError(t('expenses.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t('expenses.title')}</h1>
        <p className="text-ml-cream-dim text-sm">{t('expenses.subtitle')}</p>
      </div>

      <div className="bg-ml-card border border-ml-border rounded p-4 max-w-xs">
        <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t('expenses.totalLabel')}</div>
        <div className="text-2xl font-bold text-ml-red">{formatPrice(total)}</div>
      </div>

      <section>
        <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('expenses.newExpense')}</h2>
        <form onSubmit={handleSubmit} className="bg-ml-card border border-ml-border rounded p-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('expenses.branchLabel')}</label>
            <select
              value={branchValue}
              onChange={(e) => setBranchValue(e.target.value)}
              className="w-full bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-sm"
            >
              <option value={CORPORATE_VALUE}>{t('expenses.corporate')}</option>
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>{b.branchName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('expenses.categoryLabel')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`expenses.categories.${c}`)}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('expenses.descriptionLabel')}</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('expenses.descriptionPlaceholder')}
              className="w-full bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ml-red"
            />
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('expenses.amountLabel')}</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ml-red"
            />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded bg-ml-red text-ml-cream text-sm font-medium hover:bg-ml-red-bright disabled:opacity-40 transition-colors"
            >
              {submitting ? t('expenses.saving') : t('expenses.addExpense')}
            </button>
            {submitError && <p className="text-ml-red text-xs">{submitError}</p>}
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('expenses.historyTitle')}</h2>
        {error && (
          <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 text-sm">
            {t('expenses.loadError')}: {error}
          </div>
        )}
        {loading && !data ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded bg-ml-card border border-ml-border animate-pulse" />
            ))}
          </div>
        ) : (
          data && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border">
                  <th className="py-2">{t('expenses.branchLabel')}</th>
                  <th className="py-2">{t('expenses.categoryLabel')}</th>
                  <th className="py-2">{t('expenses.descriptionLabel')}</th>
                  <th className="py-2">{t('expenses.amountLabel')}</th>
                  <th className="py-2">{t('expenses.dateLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {[...expenses].reverse().map((exp) => (
                  <tr key={exp.id} className="border-b border-ml-border">
                    <td className="py-2">{branchLabelFor(exp.branchId)}</td>
                    <td className="py-2">{t(`expenses.categories.${exp.category}`)}</td>
                    <td className="py-2">{exp.description}</td>
                    <td className="py-2 font-medium">{formatPrice(exp.amount)}</td>
                    <td className="py-2 text-ml-cream-dim">{formatDate(exp.date, lang)}</td>
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
