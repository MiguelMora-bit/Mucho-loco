import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../lib/stores/auth.store';
import { useMyAttendanceStore } from '../lib/stores/myAttendance.store';
import { useTeamAttendanceStore } from '../lib/stores/teamAttendance.store';
import { attendanceRepository, AlreadyClockedInError, NoOpenEntryError } from '../lib/repositories/attendance.repository';
import { getCurrentBranchId } from '../lib/currentBranch';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function AttendancePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const myAttendance = useMyAttendanceStore();
  const team = useTeamAttendanceStore();
  const { fetch: fetchMine } = myAttendance;
  const { fetch: fetchTeam } = team;
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isManager = user?.role === 'manager';

  useEffect(() => {
    fetchMine();
    if (isManager) fetchTeam();
  }, [fetchMine, fetchTeam, isManager]);

  async function handleClockIn() {
    if (!user) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await attendanceRepository.clockIn(getCurrentBranchId(), user.email, user.name || user.email);
      await fetchMine();
      if (isManager) await fetchTeam();
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
      await fetchMine();
      if (isManager) await fetchTeam();
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
                          formatTime(entry.clockOut)
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
