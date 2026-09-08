import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { membershipRepository } from '../../lib/repositories/membership.repository';
import { CURRENT_BRANCH_ID } from '../../lib/currentBranch';
import { CURRENT_BRANCH_PRICE, PERIOD_MULTIPLIERS, TIER_FACTORS } from '../../lib/membershipPlans';
import { calculateMembershipPrice } from '../../lib/pricing';
import type { MemberAccessRecord, MembershipPayment, PaymentMethod, PlanKey, TierKey } from '@mucho-loco/types';

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX')}`;
}

const TIER_KEYS: TierKey[] = ['single', 'all'];
const PERIOD_KEYS: PlanKey[] = ['visit', 'weekly', 'monthly', 'quarterly', 'annual'];
const TIER_I18N_KEY: Record<TierKey, string> = { single: 'tierSingle', all: 'tierAll' };
const PERIOD_I18N_KEY: Record<PlanKey, string> = {
  visit: 'periodVisit',
  weekly: 'periodWeekly',
  monthly: 'periodMonthly',
  quarterly: 'periodQuarterly',
  annual: 'periodAnnual',
};
const DEMO_CODES = ['ML-QR-DIEGO01', 'ML-QR-ANA02', 'ML-QR-CARLOS03'];

function PaymentMethodPicker({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  const { t } = useTranslation();
  const options: Array<{ key: PaymentMethod; label: string }> = [
    { key: 'cash', label: t('counter.membership.paymentCash') },
    { key: 'transfer', label: t('counter.membership.paymentTransfer') },
    { key: 'card', label: t('counter.membership.paymentCardTerminal') },
  ];
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={
            'flex-1 py-2 rounded text-sm font-medium border ' +
            (value === opt.key ? 'bg-ml-red border-ml-red text-ml-cream' : 'border-ml-border text-ml-cream-dim')
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PlanPicker({
  tierKey,
  periodKey,
  onTierChange,
  onPeriodChange,
}: {
  tierKey: TierKey;
  periodKey: PlanKey;
  onTierChange: (t: TierKey) => void;
  onPeriodChange: (p: PlanKey) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('counter.membership.planLabel')}</label>
        <div className="flex gap-2">
          {TIER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onTierChange(key)}
              className={
                'flex-1 py-2 rounded text-sm border ' +
                (tierKey === key ? 'bg-ml-red border-ml-red text-ml-cream' : 'border-ml-border text-ml-cream-dim')
              }
            >
              {t(`counter.membership.${TIER_I18N_KEY[key]}`)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('counter.membership.periodLabel')}</label>
        <div className="flex gap-2 flex-wrap">
          {PERIOD_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onPeriodChange(key)}
              className={
                'px-3 py-1.5 rounded text-sm border ' +
                (periodKey === key ? 'bg-ml-red border-ml-red text-ml-cream' : 'border-ml-border text-ml-cream-dim')
              }
            >
              {t(`counter.membership.${PERIOD_I18N_KEY[key]}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MembershipTab() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'new' | 'renew'>('new');
  const [tierKey, setTierKey] = useState<TierKey>('single');
  const [periodKey, setPeriodKey] = useState<PlanKey>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const [memberName, setMemberName] = useState('');
  const [phone, setPhone] = useState('');

  const [qrCode, setQrCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundMember, setFoundMember] = useState<MemberAccessRecord | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successPayment, setSuccessPayment] = useState<MembershipPayment | null>(null);

  const price = calculateMembershipPrice(CURRENT_BRANCH_PRICE, TIER_FACTORS[tierKey], PERIOD_MULTIPLIERS[periodKey]);

  function resetForm() {
    setMemberName(''); setPhone(''); setQrCode(''); setFoundMember(null); setSearchError(null);
  }

  function switchMode(next: 'new' | 'renew') {
    setMode(next); setSuccessPayment(null); setSubmitError(null); resetForm();
  }

  async function handleSearch(code: string) {
    if (!code.trim()) return;
    setSearching(true); setSearchError(null); setFoundMember(null);
    try {
      const member = await membershipRepository.findMember(code);
      if (!member) setSearchError(t('counter.membership.qrNotFound'));
      else setFoundMember(member);
    } finally { setSearching(false); }
  }

  async function handleSignUp() {
    setSubmitting(true); setSubmitError(null);
    try {
      const payment = await membershipRepository.signUpNewMember(CURRENT_BRANCH_ID, { memberName, phone, tierKey, periodKey, paymentMethod });
      setSuccessPayment(payment); resetForm();
    } catch (e) { console.error(e); setSubmitError(t('counter.membership.errorSignUp')); }
    finally { setSubmitting(false); }
  }

  async function handleRenew() {
    if (!foundMember) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const payment = await membershipRepository.renewMembership(CURRENT_BRANCH_ID, foundMember.qrCode, tierKey, periodKey, paymentMethod);
      setSuccessPayment(payment); resetForm();
    } catch (e) { console.error(e); setSubmitError(t('counter.membership.errorRenew')); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex gap-2 mb-6">
        <button onClick={() => switchMode('new')} className={'px-4 py-2 rounded text-sm font-medium border ' + (mode === 'new' ? 'bg-ml-red border-ml-red text-ml-cream' : 'border-ml-border text-ml-cream-dim')}>{t('counter.membership.newMember')}</button>
        <button onClick={() => switchMode('renew')} className={'px-4 py-2 rounded text-sm font-medium border ' + (mode === 'renew' ? 'bg-ml-red border-ml-red text-ml-cream' : 'border-ml-border text-ml-cream-dim')}>{t('counter.membership.renew')}</button>
      </div>

      {successPayment && (
        <div className="bg-ml-green/10 border border-ml-green text-ml-green rounded p-4 mb-6">
          <div className="font-bold mb-1">
            ✓ {successPayment.isNewMember ? t('counter.membership.successSignedUp') : t('counter.membership.successRenewed')} — {formatPrice(successPayment.amount)}
          </div>
          <div className="text-sm">
            {successPayment.memberName} · {t(`counter.membership.${TIER_I18N_KEY[successPayment.tierKey]}`)} · {t(`counter.membership.${PERIOD_I18N_KEY[successPayment.periodKey]}`)}
          </div>
          {successPayment.isNewMember && (
            <div className="font-mono text-lg mt-2 tracking-wide">{t('counter.membership.qrCodeLabel')}: {successPayment.qrCode}</div>
          )}
        </div>
      )}

      <div className="bg-ml-card border border-ml-border rounded p-5 space-y-5">
        {mode === 'new' ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('counter.membership.nameLabel')}</label>
              <input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder={t('counter.membership.namePlaceholder')}
                className="w-full bg-ml-card-2 border border-ml-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ml-red" />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('counter.membership.phoneLabel')}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('counter.membership.phonePlaceholder')}
                className="w-full bg-ml-card-2 border border-ml-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ml-red" />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('counter.membership.qrLabel')}</label>
            <div className="flex gap-2 mb-2">
              <input value={qrCode} onChange={(e) => setQrCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch(qrCode)}
                placeholder={t('counter.membership.qrPlaceholder')} className="flex-1 bg-ml-card-2 border border-ml-border rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-ml-red" />
              <button onClick={() => handleSearch(qrCode)} disabled={searching || !qrCode.trim()}
                className="px-4 py-2 rounded bg-ml-card-2 border border-ml-border text-sm disabled:opacity-40">
                {searching ? t('counter.membership.searching') : t('counter.membership.search')}
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              {DEMO_CODES.map((c) => (
                <button key={c} onClick={() => { setQrCode(c); handleSearch(c); }}
                  className="text-xs font-mono px-2 py-1 rounded border border-ml-border text-ml-cream-dim hover:text-ml-cream">
                  {c}
                </button>
              ))}
            </div>
            {searchError && <p className="text-ml-red text-sm mb-2">{searchError}</p>}
            {foundMember && (
              <div className="bg-ml-card-2 border border-ml-border rounded p-3 text-sm">
                <div className="font-medium">{foundMember.memberName}</div>
                <div className="text-ml-cream-dim flex items-center gap-2 mt-1">
                  {t('counter.membership.currentStatus')}
                  <span
                    className={
                      'px-2 py-1 rounded text-xs font-mono uppercase border ' +
                      (foundMember.status === 'active'
                        ? 'bg-ml-green/10 border-ml-green text-ml-green'
                        : foundMember.status === 'grace'
                          ? 'bg-ml-orange/10 border-ml-orange text-ml-orange'
                          : 'bg-ml-red/10 border-ml-red text-ml-red')
                    }
                  >
                    {foundMember.status}
                  </span>
                  · {t('counter.membership.expiresLabel')} {foundMember.expiresAt}
                </div>
              </div>
            )}
          </div>
        )}

        {(mode === 'new' || foundMember) && (
          <>
            <PlanPicker tierKey={tierKey} periodKey={periodKey} onTierChange={setTierKey} onPeriodChange={setPeriodKey} />
            <div className="flex justify-between items-baseline pt-2 border-t border-ml-border">
              <span className="text-sm text-ml-cream-dim">{t('counter.membership.totalLabel')}</span>
              <span className="text-2xl font-bold text-ml-red">{formatPrice(price)}</span>
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">{t('counter.membership.paymentMethodLabel')}</label>
              <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
            </div>
            {submitError && <p className="text-ml-red text-sm">{submitError}</p>}
            <button onClick={mode === 'new' ? handleSignUp : handleRenew} disabled={submitting || (mode === 'new' ? !memberName.trim() : !foundMember)}
              className="w-full py-2.5 rounded bg-ml-red text-ml-cream font-medium hover:bg-ml-red-bright disabled:opacity-40 transition-colors">
              {submitting ? t('counter.membership.processing') : mode === 'new' ? t('counter.membership.signUpAndCharge') : t('counter.membership.confirmRenewal')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
