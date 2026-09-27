import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useExpensesStore } from '../lib/stores/expenses.store';
import { useBranchStatsStore } from '../lib/stores/branchStats.store';
import { expensesRepository, ExpenseNotFoundError } from '../lib/repositories/expenses.repository';
import { formatDate } from '../lib/dates';
import { currentDay } from '../lib/currentMonth';
import type { Expense, ExpenseCategory, Lang } from '@mucho-loco/types';

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX')}`;
}

const CATEGORIES: ExpenseCategory[] = ['rent', 'utilities', 'maintenance', 'supplies', 'marketing', 'other'];
const CORPORATE_VALUE = 'corporate';

const inputClass =
  'w-full bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ml-red';
const labelClass = 'text-xs font-mono uppercase text-ml-cream-dim block mb-1.5';

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

  const today = currentDay();
  const formRef = useRef<HTMLFormElement>(null);
  // Spec 054: el mismo formulario da de alta o corrige (`editingId`).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [branchValue, setBranchValue] = useState<string>(CORPORATE_VALUE);
  const [category, setCategory] = useState<ExpenseCategory>('rent');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Del día más reciente al más viejo, igual en mock y en backend.
  const expenses = [...(data ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const branches = branchStats.data ?? [];
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  function branchLabelFor(branchId: number | null): string {
    if (branchId === null) return t('expenses.corporate');
    return branches.find((b) => b.branchId === branchId)?.branchName ?? `#${branchId}`;
  }

  function resetForm() {
    setEditingId(null);
    setBranchValue(CORPORATE_VALUE);
    setCategory('rent');
    setDescription('');
    setAmount('');
    setDate(currentDay());
  }

  function startEdit(expense: Expense) {
    setEditingId(expense.id);
    setBranchValue(expense.branchId === null ? CORPORATE_VALUE : String(expense.branchId));
    setCategory(expense.category);
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setDate(expense.date);
    setNotice(null);
    setConfirmingId(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!description.trim() || !date) return;
    // Pesos enteros: el backend rechaza centavos, mejor decirlo aquí.
    if (!Number.isInteger(amountNum) || amountNum <= 0) {
      setNotice(t('expenses.wholePesos'));
      return;
    }
    setSubmitting(true);
    setNotice(null);
    const input = {
      branchId: branchValue === CORPORATE_VALUE ? null : Number(branchValue),
      category,
      description: description.trim(),
      amount: amountNum,
      date,
    };
    try {
      if (editingId) await expensesRepository.update(editingId, input);
      else await expensesRepository.create(input);
      resetForm();
      await fetch();
    } catch (err) {
      console.error(err);
      if (err instanceof ExpenseNotFoundError) {
        setNotice(t('expenses.errorNotFound'));
        resetForm();
        await fetch();
      } else {
        setNotice(editingId ? t('expenses.errorSave') : t('expenses.errorGeneric'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setNotice(null);
    try {
      await expensesRepository.remove(id);
      if (editingId === id) resetForm();
      await fetch();
    } catch (err) {
      console.error(err);
      if (err instanceof ExpenseNotFoundError) {
        setNotice(t('expenses.errorNotFound'));
        await fetch();
      } else {
        setNotice(t('expenses.errorDelete'));
      }
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
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
        <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">
          {editingId ? t('expenses.editExpense') : t('expenses.newExpense')}
        </h2>
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className={
            'bg-ml-card border rounded p-4 grid grid-cols-2 gap-4 ' + (editingId ? 'border-ml-orange' : 'border-ml-border')
          }
        >
          <div>
            <label htmlFor="expense-branch" className={labelClass}>{t('expenses.branchLabel')}</label>
            <select id="expense-branch" value={branchValue} onChange={(e) => setBranchValue(e.target.value)} className={inputClass}>
              <option value={CORPORATE_VALUE}>{t('expenses.corporate')}</option>
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>{b.branchName}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="expense-category" className={labelClass}>{t('expenses.categoryLabel')}</label>
            <select
              id="expense-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`expenses.categories.${c}`)}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="expense-description" className={labelClass}>{t('expenses.descriptionLabel')}</label>
            <input
              id="expense-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('expenses.descriptionPlaceholder')}
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="expense-amount" className={labelClass}>{t('expenses.amountLabel')}</label>
            <input
              id="expense-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="1"
              step="1"
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="expense-date" className={labelClass}>{t('expenses.dateLabel')}</label>
            <input
              id="expense-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded bg-ml-red text-ml-cream text-sm font-medium hover:bg-ml-red-bright disabled:opacity-40 transition-colors"
            >
              {submitting ? t('expenses.saving') : editingId ? t('expenses.saveChanges') : t('expenses.addExpense')}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-ml-cream-dim underline">
                {t('expenses.cancelEdit')}
              </button>
            )}
            {notice && <p className="text-ml-red text-xs">{notice}</p>}
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
                  <th className="py-2">{t('expenses.dateLabel')}</th>
                  <th className="py-2">{t('expenses.branchLabel')}</th>
                  <th className="py-2">{t('expenses.categoryLabel')}</th>
                  <th className="py-2">{t('expenses.descriptionLabel')}</th>
                  <th className="py-2">{t('expenses.amountLabel')}</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    data-expense={exp.id}
                    className={'border-b border-ml-border ' + (editingId === exp.id ? 'bg-ml-orange/10' : '')}
                  >
                    <td className="py-2 text-ml-cream-dim whitespace-nowrap">{formatDate(exp.date, lang)}</td>
                    <td className="py-2">{branchLabelFor(exp.branchId)}</td>
                    <td className="py-2">{t(`expenses.categories.${exp.category}`)}</td>
                    <td className="py-2">{exp.description}</td>
                    <td className="py-2 font-medium">{formatPrice(exp.amount)}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {confirmingId === exp.id ? (
                        <span className="inline-flex items-center gap-2 text-xs">
                          <span className="text-ml-orange">{t('expenses.confirmDelete')}</span>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            disabled={deletingId === exp.id}
                            className="px-2 py-1 rounded bg-ml-red text-ml-cream disabled:opacity-40"
                          >
                            {t('expenses.confirmYes')}
                          </button>
                          <button onClick={() => setConfirmingId(null)} className="underline text-ml-cream-dim">
                            {t('expenses.confirmNo')}
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex gap-3 text-xs font-mono">
                          <button onClick={() => startEdit(exp)} className="underline text-ml-cream-dim hover:text-ml-cream">
                            {t('expenses.edit')}
                          </button>
                          <button onClick={() => setConfirmingId(exp.id)} className="underline text-ml-cream-dim hover:text-ml-red">
                            {t('expenses.delete')}
                          </button>
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
