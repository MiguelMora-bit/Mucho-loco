import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AttendanceEntry } from '@mucho-loco/types';
import { useAuthStore } from '../lib/stores/auth.store';
import { useMyAttendanceStore } from '../lib/stores/myAttendance.store';
import { useTeamAttendanceStore } from '../lib/stores/teamAttendance.store';
import { useForgottenShiftsStore } from '../lib/stores/forgottenShifts.store';
import {
  attendanceRepository,
  AlreadyClockedInError,
  EntryAlreadyClosedError,
  EntryNotFoundError,
  InvalidClockOutError,
  NoOpenEntryError,
} from '../lib/repositories/attendance.repository';
import type { ClockOutProblem } from '../lib/repositories/attendance.errors';
import { clockOutProblem, MAX_SHIFT_HOURS } from '../lib/clockOutRule';
import { getCurrentBranchId } from '../lib/currentBranch';
import { formatDateTime, langOf } from '../lib/dates';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

const HOUR_MS = 3_600_000;

/** `datetime-local` habla en hora local sin zona: `YYYY-MM-DDTHH:mm`. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const PROBLEM_TEXT: Record<ClockOutProblem, string> = {
  before_clock_in: 'attendance.errorBeforeClockIn',
  in_future: 'attendance.errorInFuture',
  too_long: 'attendance.errorTooLong',
};

/**
 * Un turno que alguien olvidó cerrar (spec 055): el gerente captura la hora
 * real de salida. Misma regla que el backend antes de mandar.
 */
function ForgottenShift({
  entry,
  onChanged,
  onClosed,
}: {
  entry: AttendanceEntry;
  onChanged: () => Promise<void>;
  onClosed: (closed: AttendanceEntry) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const [range, setRange] = useState<{ min: string; max: string } | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clockIn = new Date(entry.clockIn);

  function startFix() {
    // El tope se calcula al abrir, no al pintar: ahora o 24 h después de entrar.
    const latest = new Date(Math.min(Date.now(), clockIn.getTime() + MAX_SHIFT_HOURS * HOUR_MS));
    setRange({ min: toLocalInput(new Date(clockIn.getTime() + 60_000)), max: toLocalInput(latest) });
    setValue(toLocalInput(new Date(Math.min(latest.getTime(), clockIn.getTime() + 8 * HOUR_MS))));
    setError(null);
  }

  async function save() {
    const clockOut = new Date(value);
    const problem = Number.isNaN(clockOut.getTime()) ? 'before_clock_in' : clockOutProblem(clockIn, clockOut);
    if (problem) {
      setError(t(PROBLEM_TEXT[problem]));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const closed = await attendanceRepository.closeEntry(entry.id, clockOut.toISOString());
      setRange(null);
      onClosed(closed);
      await onChanged();
    } catch (e) {
      console.error(e);
      if (e instanceof InvalidClockOutError) {
        setError(t(PROBLEM_TEXT[e.reason]));
      } else if (e instanceof EntryAlreadyClosedError || e instanceof EntryNotFoundError) {
        setError(t('attendance.errorAlreadyClosed'));
        await onChanged();
      } else {
        setError(t('attendance.errorFix'));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <li data-entry={entry.id} className="bg-ml-card border border-ml-orange rounded p-3 text-sm space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="font-medium">{entry.staffName}</span>
          <span className="text-ml-cream-dim ml-2">{t('attendance.clockedInAt', { date: formatDateTime(entry.clockIn, lang) })}</span>
        </div>
        {!range && (
          <button onClick={startFix} className="text-xs underline text-ml-orange">
            {t('attendance.fixClockOut')}
          </button>
        )}
      </div>
      {range && (
        <div className="flex items-end gap-3 flex-wrap">
          <label className="text-xs">
            <span className="block font-mono uppercase text-ml-cream-dim mb-1">{t('attendance.clockOutAt')}</span>
            <input
              type="datetime-local"
              value={value}
              min={range.min}
              max={range.max}
              onChange={(e) => setValue(e.target.value)}
              className="bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ml-orange"
            />
          </label>
          <button
            onClick={save}
            disabled={saving || !value}
            className="px-4 py-2 rounded bg-ml-orange text-ml-black text-sm font-medium disabled:opacity-40"
          >
            {saving ? t('attendance.processing') : t('attendance.saveClockOut')}
          </button>
          <button onClick={() => setRange(null)} disabled={saving} className="text-sm underline text-ml-cream-dim">
            {t('attendance.cancel')}
          </button>
        </div>
      )}
      {error && <p className="text-ml-red text-xs">{error}</p>}
    </li>
  );
}

export function AttendancePage() {
  const { t, i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const [fixedNotice, setFixedNotice] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const myAttendance = useMyAttendanceStore();
  const team = useTeamAttendanceStore();
  const openEntries = useForgottenShiftsStore();
  const { fetch: fetchMine } = myAttendance;
  const { fetch: fetchTeam } = team;
  const { fetch: fetchOpen } = openEntries;
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isManager = user?.role === 'manager';

  useEffect(() => {
    fetchMine();
    if (isManager) {
      fetchTeam();
      fetchOpen();
    }
  }, [fetchMine, fetchTeam, fetchOpen, isManager]);

  // Tras corregir una salida cambian las tres vistas (y la propia, si era la del gerente).
  async function refreshAll() {
    await Promise.all([fetchMine(), fetchTeam(), fetchOpen()]);
  }

  async function handleClockIn() {
    if (!user) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await attendanceRepository.clockIn(getCurrentBranchId(), user.email, user.name || user.email);
      if (isManager) await refreshAll();
      else await fetchMine();
    } catch (e) {
      setActionError(e instanceof AlreadyClockedInError ? t('attendance.errorAlreadyIn') : t('attendance.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClockOut() {
    if (!user) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await attendanceRepository.clockOut(user.email);
      if (isManager) await refreshAll();
      else await fetchMine();
    } catch (e) {
      setActionError(e instanceof NoOpenEntryError ? t('attendance.errorNoOpenEntry') : t('attendance.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t('attendance.title')}</h1>
      </div>

      <section className="bg-ml-card border border-ml-border rounded p-4">
        {myAttendance.loading && !myAttendance.data ? (
          <div className="h-16 rounded bg-ml-card-2 animate-pulse" />
        ) : myAttendance.data ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1">{t('attendance.clockedInSince')}</div>
              <div className="text-lg font-bold text-ml-green">{formatTime(myAttendance.data.clockIn)}</div>
            </div>
            <button
              onClick={handleClockOut}
              disabled={submitting}
              className="px-5 py-2.5 rounded bg-ml-red text-ml-cream font-medium hover:bg-ml-red-bright disabled:opacity-40 transition-colors"
            >
              {submitting ? t('attendance.processing') : t('attendance.clockOut')}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-ml-cream-dim">{t('attendance.notClockedIn')}</div>
            <button
              onClick={handleClockIn}
              disabled={submitting}
              className="px-5 py-2.5 rounded bg-ml-red text-ml-cream font-medium hover:bg-ml-red-bright disabled:opacity-40 transition-colors"
            >
              {submitting ? t('attendance.processing') : t('attendance.clockIn')}
            </button>
          </div>
        )}
        {actionError && <p className="text-ml-red text-xs mt-3">{actionError}</p>}
      </section>

      {isManager && (
        <section>
          <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-1">{t('attendance.forgottenTitle')}</h2>
          <p className="text-xs text-ml-cream-dim mb-3">{t('attendance.forgottenHint')}</p>
          {fixedNotice && <p className="text-sm text-ml-green mb-3">{fixedNotice}</p>}
          {openEntries.loading && !openEntries.data ? (
            <div className="h-10 rounded bg-ml-card border border-ml-border animate-pulse" />
          ) : openEntries.data && openEntries.data.length === 0 ? (
            <p className="text-ml-muted text-sm">{t('attendance.forgottenEmpty')}</p>
          ) : (
            openEntries.data && (
              <ul className="space-y-2">
                {openEntries.data.map((entry) => (
                  <ForgottenShift
                    key={entry.id}
                    entry={entry}
                    onChanged={refreshAll}
                    onClosed={(closed) =>
                      setFixedNotice(
                        t('attendance.fixedNotice', {
                          name: closed.staffName,
                          date: formatDateTime(closed.clockOut ?? closed.clockIn, lang),
                        }),
                      )
                    }
                  />
                ))}
              </ul>
            )
          )}
        </section>
      )}

      {isManager && (
        <section>
          <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('attendance.teamToday')}</h2>
          {team.error && (
            <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 text-sm">
              {t('attendance.loadError')}: {team.error}
            </div>
          )}
          {team.loading && !team.data ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-10 rounded bg-ml-card border border-ml-border animate-pulse" />
              ))}
            </div>
          ) : team.data && team.data.length === 0 ? (
            <p className="text-ml-muted text-sm">{t('attendance.teamEmpty')}</p>
          ) : (
            team.data && (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border">
                    <th className="py-2">{t('attendance.staffLabel')}</th>
                    <th className="py-2">{t('attendance.clockInLabel')}</th>
                    <th className="py-2">{t('attendance.clockOutLabel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {team.data.map((entry) => (
                    <tr key={entry.id} className="border-b border-ml-border">
                      <td className="py-2">{entry.staffName}</td>
                      <td className="py-2">{formatTime(entry.clockIn)}</td>
                      <td className="py-2">
                        {entry.clockOut ? (
                          <>
                            {formatTime(entry.clockOut)}
                            {entry.correctedBy && (
                              <span className="ml-2 text-xs text-ml-orange">
                                {t('attendance.correctedBy', { name: entry.correctedBy })}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-xs font-mono uppercase bg-ml-green/10 border border-ml-green text-ml-green">
                            {t('attendance.onShift')}
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
      )}
    </div>
  );
}
