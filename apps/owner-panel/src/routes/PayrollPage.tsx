import { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEmployeesStore } from '../lib/stores/employees.store';
import { usePayrollPeriodsStore } from '../lib/stores/payrollPeriods.store';
import { useAttendanceStore } from '../lib/stores/attendance.store';
import { usePayslipsStore } from '../lib/stores/payslips.store';
import { useBranchStatsStore } from '../lib/stores/branchStats.store';
import { payrollRepository, PeriodAlreadyOpenError } from '../lib/repositories/payroll.repository';
import { formatDate, formatPeriodRange } from '../lib/dates';
import type { Lang } from '@mucho-loco/types';

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX')}`;
}

export function PayrollPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;

  const employeesStore = useEmployeesStore();
  const periodsStore = usePayrollPeriodsStore();
  const attendanceStore = useAttendanceStore();
  const payslipsStore = usePayslipsStore();
  const branchStats = useBranchStatsStore();

  const { fetch: fetchEmployees } = employeesStore;
  const { fetch: fetchPeriods } = periodsStore;
  const { fetch: fetchAttendance } = attendanceStore;
  const { fetch: fetchPayslips } = payslipsStore;
  const { fetch: fetchBranchStats } = branchStats;

  useEffect(() => {
    fetchEmployees();
    fetchPeriods();
    fetchAttendance();
    fetchPayslips();
    fetchBranchStats();
  }, [fetchEmployees, fetchPeriods, fetchAttendance, fetchPayslips, fetchBranchStats]);

  const [periodOverride, setPeriodOverride] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [ranPeriodId, setRanPeriodId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const periods = periodsStore.data ?? [];
  const employees = employeesStore.data ?? [];
  const branches = branchStats.data ?? [];

  // Derived at render time (not via effect+setState, and deliberately not
  // memoized) — defaults to the open period until the user picks a
  // different one. getPayslips()/getPeriods() return live references into
  // mutable mock arrays (same convention as branch-app's mock datasources),
  // so a useMemo keyed on that array reference would miss in-place
  // mutations like runPayroll()'s PAYSLIPS.push(...) — the array reference
  // itself never changes, only its contents, so memoizing here silently
  // shows stale data after running payroll. Recomputing on every render
  // avoids that trap entirely; these arrays are tiny (a handful of rows).
  const defaultPeriodId = periods.length > 0 ? (periods.find((p) => p.status === 'open') ?? periods[periods.length - 1]).id : null;
  const selectedPeriodId = periodOverride ?? defaultPeriodId;

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) ?? null;
  const openPeriod = periods.find((p) => p.status === 'open') ?? null;
  const attendanceForPeriod = (attendanceStore.data ?? []).filter((a) => a.periodId === selectedPeriodId);
  const payslipsForPeriod = (payslipsStore.data ?? []).filter((p) => p.periodId === selectedPeriodId);

  const totalNet = payslipsForPeriod.reduce((sum, p) => sum + p.netPay, 0);

  function branchLabelFor(branchId: number): string {
    return branches.find((b) => b.branchId === branchId)?.branchName ?? `#${branchId}`;
  }

  async function handleRunPayroll() {
    if (!selectedPeriod) return;
    setRunning(true);
    setRunError(null);
    try {
      await payrollRepository.runPayroll(selectedPeriod.id);
      // Running opens the next period (spec 050), which would become the
      // default selection — keep the one just paid on screen, with its payslips.
      setPeriodOverride(selectedPeriod.id);
      setRanPeriodId(selectedPeriod.id);
      await Promise.all([fetchPayslips(), fetchPeriods()]);
    } catch (err) {
      console.error(err);
      setRunError(t('payroll.runError'));
    } finally {
      setRunning(false);
    }
  }

  async function handleOpenNextPeriod() {
    setOpening(true);
    setOpenError(null);
    try {
      const opened = await payrollRepository.openNextPeriod();
      setPeriodOverride(opened.id);
      await fetchPeriods();
    } catch (err) {
      console.error(err);
      if (err instanceof PeriodAlreadyOpenError) {
        setOpenError(t('payroll.openErrorAlreadyOpen'));
        setPeriodOverride(null);
        await fetchPeriods();
      } else {
        setOpenError(t('payroll.openError'));
      }
    } finally {
      setOpening(false);
    }
  }

  const loading = employeesStore.loading || periodsStore.loading || attendanceStore.loading || payslipsStore.loading;
  const error = employeesStore.error || periodsStore.error || attendanceStore.error || payslipsStore.error;

  const rows = attendanceForPeriod
    .map((a) => {
      const employee = employees.find((e) => e.id === a.employeeId);
      if (!employee) return null;
      const payslip = payslipsForPeriod.find((p) => p.employeeId === a.employeeId) ?? null;
      return { employee, attendance: a, payslip };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t('payroll.title')}</h1>
        <p className="text-ml-cream-dim text-sm">{t('payroll.subtitle')}</p>
        <p className="text-ml-orange text-xs mt-2 max-w-2xl">{t('payroll.disclaimer')}</p>
      </div>

      {error && (
        <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 text-sm">
          {t('payroll.loadError')}: {error}
        </div>
      )}

      {periodsStore.data && !openPeriod && (
        <div className="bg-ml-orange/10 border border-ml-orange rounded p-4 space-y-3">
          <p className="text-sm text-ml-orange">{t('payroll.noOpenPeriod')}</p>
          <button
            onClick={handleOpenNextPeriod}
            disabled={opening}
            className="px-4 py-2 rounded bg-ml-red text-ml-cream text-sm font-medium hover:bg-ml-red-bright disabled:opacity-40 transition-colors"
          >
            {opening ? t('payroll.opening') : t('payroll.openNextPeriod')}
          </button>
        </div>
      )}
      {openError && <p className="text-ml-red text-xs">{openError}</p>}

      {loading && !periodsStore.data ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded bg-ml-card border border-ml-border animate-pulse" />
          ))}
        </div>
      ) : periods.length === 0 ? (
        <p className="text-ml-muted text-sm">{t('payroll.emptyState')}</p>
      ) : (
        <>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('payroll.periodLabel')}</label>
              <select
                value={selectedPeriodId ?? ''}
                onChange={(e) => setPeriodOverride(e.target.value)}
                className="bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ml-red"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>{formatPeriodRange(p.startDate, p.endDate, lang)}</option>
                ))}
              </select>
            </div>
            {selectedPeriod && (
              <span
                className={
                  'px-2 py-1 rounded text-xs font-mono uppercase border ' +
                  (selectedPeriod.status === 'open'
                    ? 'bg-ml-green/10 border-ml-green text-ml-green'
                    : 'bg-ml-muted/10 border-ml-muted text-ml-muted')
                }
              >
                {selectedPeriod.status === 'open' ? t('payroll.statusOpen') : t('payroll.statusClosed')}
              </span>
            )}
          </div>

          <div className="flex gap-6">
            <div className="bg-ml-card border border-ml-border rounded p-4 flex-1">
              <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t('payroll.headcountLabel')}</div>
              <div className="text-2xl font-bold text-ml-orange">{attendanceForPeriod.length}</div>
            </div>
            <div className="bg-ml-card border border-ml-border rounded p-4 flex-1">
              <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t('payroll.totalNetLabel')}</div>
              {payslipsForPeriod.length > 0 ? (
                <div className="text-2xl font-bold text-ml-red">{formatPrice(totalNet)}</div>
              ) : (
                <div className="text-sm text-ml-cream-dim">{t('payroll.pendingRunNote')}</div>
              )}
            </div>
          </div>

          {selectedPeriod?.status === 'open' && (
            <div>
              <button
                onClick={handleRunPayroll}
                disabled={running}
                className="px-4 py-2 rounded bg-ml-red text-ml-cream text-sm font-medium hover:bg-ml-red-bright disabled:opacity-40 transition-colors"
              >
                {running ? t('payroll.running') : t('payroll.runPayroll')}
              </button>
              {runError && <p className="text-ml-red text-xs mt-2">{runError}</p>}
            </div>
          )}
          {selectedPeriod?.status === 'closed' && (
            <div className="space-y-2">
              <p className="text-ml-cream-dim text-sm">{t('payroll.closedNote')}</p>
              {ranPeriodId === selectedPeriodId && openPeriod && (
                <p className="text-ml-green text-sm">
                  {t('payroll.nextPeriodOpened', {
                    range: formatPeriodRange(openPeriod.startDate, openPeriod.endDate, lang),
                  })}
                </p>
              )}
            </div>
          )}

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border">
                <th className="py-2">{t('payroll.employeeLabel')}</th>
                <th className="py-2">{t('payroll.branchLabel')}</th>
                <th className="py-2">{t('payroll.roleLabel')}</th>
                <th className="py-2">{t('payroll.daysWorkedLabel')}</th>
                <th className="py-2">{t('payroll.grossLabel')}</th>
                <th className="py-2">{t('payroll.isrLabel')}</th>
                <th className="py-2">{t('payroll.imssLabel')}</th>
                <th className="py-2">{t('payroll.netLabel')}</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ employee, attendance: a, payslip }) => (
                <Fragment key={employee.id}>
                  <tr className="border-b border-ml-border">
                    <td className="py-2">{employee.name}</td>
                    <td className="py-2">{branchLabelFor(employee.branchId)}</td>
                    <td className="py-2">{t(`payroll.roles.${employee.role}`)}</td>
                    <td className="py-2">{a.daysWorked}/{selectedPeriod?.totalDays}</td>
                    <td className="py-2">{payslip ? formatPrice(payslip.grossPay) : '—'}</td>
                    <td className="py-2">{payslip ? formatPrice(payslip.isrDeduction) : '—'}</td>
                    <td className="py-2">{payslip ? formatPrice(payslip.imssDeduction) : '—'}</td>
                    <td className="py-2 font-medium">{payslip ? formatPrice(payslip.netPay) : '—'}</td>
                    <td className="py-2">
                      {payslip && (
                        <button
                          onClick={() => setExpandedId(expandedId === payslip.id ? null : payslip.id)}
                          className="text-xs font-mono text-ml-cream-dim hover:text-ml-cream underline"
                        >
                          {expandedId === payslip.id ? t('payroll.hideReceipt') : t('payroll.viewReceipt')}
                        </button>
                      )}
                    </td>
                  </tr>
                  {payslip && expandedId === payslip.id && (
                    <tr className="border-b border-ml-border">
                      <td colSpan={9} className="py-4">
                        <div className="bg-ml-card-2 border border-ml-border rounded p-4 max-w-md">
                          <div className="font-bold text-lg mb-2">{t('payroll.receiptTitle')}</div>
                          <div className="text-sm text-ml-cream-dim mb-3">
                            {employee.name} · {branchLabelFor(employee.branchId)} · {t(`payroll.roles.${employee.role}`)}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-ml-cream-dim">{t('payroll.daysWorkedLabel')}</span>
                            <span>{payslip.daysWorked}/{payslip.totalDays}</span>
                            <span className="text-ml-cream-dim">{t('payroll.grossLabel')}</span>
                            <span>{formatPrice(payslip.grossPay)}</span>
                            <span className="text-ml-cream-dim">{t('payroll.isrLabel')}</span>
                            <span>−{formatPrice(payslip.isrDeduction)}</span>
                            <span className="text-ml-cream-dim">{t('payroll.imssLabel')}</span>
                            <span>−{formatPrice(payslip.imssDeduction)}</span>
                            <span className="text-ml-cream-dim font-medium pt-2 border-t border-ml-border">{t('payroll.netLabel')}</span>
                            <span className="font-bold text-ml-red pt-2 border-t border-ml-border">{formatPrice(payslip.netPay)}</span>
                          </div>
                          <div className="text-xs text-ml-muted mt-3">
                            {t('payroll.generatedAtLabel')}: {formatDate(payslip.generatedAt, lang)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
