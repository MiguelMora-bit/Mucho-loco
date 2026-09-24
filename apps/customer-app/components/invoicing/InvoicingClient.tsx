'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import type { FiscalProfile, Lang, MemberCharge } from '@mucho-loco/types';
import { CFDI_USES, TAX_SYSTEMS } from '@mucho-loco/customer-core/fiscal';
import { useT } from '@/lib/hooks/useT';
import { useRouter } from '@/i18n/routing';
import { NEXT_PARAM } from '@/lib/auth';
import { ChargeList } from './ChargeList';
import { FiscalProfileForm } from './FiscalProfileForm';
import { InvoiceConfirm, type InvoiceRejection } from './InvoiceConfirm';
import { fill } from './fill';

const LABEL_CLASS = 'block font-mono text-10 text-ml-cream-dim uppercase tracking-wide-xl mb-2';
const H2_CLASS = 'font-display text-[32px] leading-none mb-4';

interface InvoicingClientProps {
  fiscalProfile: FiscalProfile | null;
  charges: MemberCharge[];
  accountEmail: string;
  /** `?charge=`: abre directo la confirmación de ese cobro si se puede facturar. */
  initialChargeId: string | null;
}

type Notice =
  | { kind: 'saved' }
  | { kind: 'invoiced'; email: string }
  | { kind: 'error'; text: string; detail?: string; fixChargeId?: string };

/**
 * Facturar: datos fiscales arriba, cobros abajo. Estado local — la página lo
 * lee del servidor una vez y cada respuesta de las rutas trae lo que cambió,
 * así que nada se recarga (FR-012).
 */
export default function InvoicingClient({ fiscalProfile, charges: initialCharges, accountEmail, initialChargeId }: InvoicingClientProps) {
  const t = useT();
  const lang = useLocale() as Lang;
  const router = useRouter();
  const copy = t.invoicing;

  const [profile, setProfile] = useState(fiscalProfile);
  const [charges, setCharges] = useState(initialCharges);
  const [editing, setEditing] = useState(fiscalProfile === null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const isAvailable = (id: string | null) =>
    id !== null && initialCharges.some((c) => c.id === id && c.invoice.status === 'available');
  // El cobro que quería facturar mientras capturaba sus datos (FR-011).
  const [pendingChargeId, setPendingChargeId] = useState<string | null>(
    fiscalProfile === null && isAvailable(initialChargeId) ? initialChargeId : null,
  );
  const [confirmChargeId, setConfirmChargeId] = useState<string | null>(
    fiscalProfile !== null && isAvailable(initialChargeId) ? initialChargeId : null,
  );

  function toLogin(chargeId?: string) {
    const back = chargeId ? `/invoicing?charge=${encodeURIComponent(chargeId)}` : '/invoicing';
    router.push(`/account?${NEXT_PARAM}=${encodeURIComponent(back)}`);
  }

  function startInvoice(chargeId: string) {
    setNotice(null);
    if (!profile) {
      setPendingChargeId(chargeId);
      setEditing(true);
      return;
    }
    setConfirmChargeId(chargeId);
  }

  function fixData(chargeId: string) {
    setNotice(null);
    setPendingChargeId(chargeId);
    setEditing(true);
  }

  function saved(next: FiscalProfile) {
    setProfile(next);
    setEditing(false);
    setNotice({ kind: 'saved' });
    if (pendingChargeId) {
      setConfirmChargeId(pendingChargeId);
      setPendingChargeId(null);
    }
  }

  function rejected(chargeId: string, rejection: InvoiceRejection) {
    setConfirmChargeId(null);
    if (rejection.charges) setCharges(rejection.charges);
    if (rejection.code === 'FISCAL_PROFILE_REQUIRED') {
      setProfile(null);
      fixData(chargeId);
      return;
    }
    setNotice({
      kind: 'error',
      text: rejection.code ? copy.errors[rejection.code] : copy.errors.connection,
      detail: rejection.detail,
      fixChargeId: rejection.code === 'FISCAL_DATA_REJECTED' ? chargeId : undefined,
    });
  }

  const confirming = confirmChargeId ? charges.find((c) => c.id === confirmChargeId) : undefined;
  const taxSystemName = profile ? TAX_SYSTEMS.find((s) => s.key === profile.taxSystem)?.name[lang] : undefined;
  const cfdiUseName = profile ? CFDI_USES.find((u) => u.key === profile.cfdiUse)?.name[lang] : undefined;

  return (
    <div className="pane active">
      <div className="max-w-[860px]">
        <div className={LABEL_CLASS}>{t.dashboard.brandLabel}</div>
        <h1 className="font-display text-[clamp(40px,5vw,64px)] leading-[0.95] mb-2">{copy.title}</h1>
        <p className="text-ml-cream-dim text-[15px] mb-7">{copy.subtitle}</p>

        {notice?.kind === 'saved' && (
          <p role="status" className="px-4 py-3 mb-6 text-sm border border-ml-border bg-ml-card">{copy.fiscal.saved}</p>
        )}
        {notice?.kind === 'invoiced' && (
          <p role="status" className="px-4 py-3 mb-6 text-sm border border-ml-border bg-ml-card">
            {fill(copy.confirm.success, { email: notice.email })}
          </p>
        )}
        {notice?.kind === 'error' && (
          <div role="alert" className="px-4 py-3 mb-6 text-sm border border-ml-red bg-ml-card grid gap-2">
            <p className="text-ml-red-bright m-0">{notice.text}</p>
            {/* El motivo del SAT tal cual: es lo que el socio tiene que corregir. */}
            {notice.detail && <p className="m-0">{notice.detail}</p>}
            {notice.fixChargeId && (
              <button
                type="button"
                onClick={() => fixData(notice.fixChargeId!)}
                className="justify-self-start px-4 py-2 bg-ml-red text-ml-cream font-bebas tracking-wide border-none cursor-pointer"
              >
                {copy.errors.fixData}
              </button>
            )}
          </div>
        )}

        <section className="mb-10">
          <h2 className={H2_CLASS}>{copy.fiscal.title}</h2>
          {editing ? (
            <>
              {!profile && (
                <div className="mb-4">
                  <b className="block">{copy.fiscal.emptyTitle}</b>
                  <span className="text-sm text-ml-cream-dim">{copy.fiscal.emptyBody}</span>
                </div>
              )}
              <FiscalProfileForm
                initial={profile}
                accountEmail={accountEmail}
                onSaved={saved}
                onCancel={profile ? () => { setEditing(false); setPendingChargeId(null); } : undefined}
                onUnauthorized={() => toLogin(pendingChargeId ?? undefined)}
              />
            </>
          ) : profile && (
            <div className="bg-ml-card border border-ml-border p-6 flex flex-wrap gap-6 justify-between items-start">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm m-0">
                <dt className="text-ml-cream-dim">{copy.fiscal.taxId}</dt><dd className="m-0">{profile.taxId}</dd>
                <dt className="text-ml-cream-dim">{copy.fiscal.legalName}</dt><dd className="m-0">{profile.legalName}</dd>
                <dt className="text-ml-cream-dim">{copy.fiscal.taxSystem}</dt><dd className="m-0">{profile.taxSystem} — {taxSystemName}</dd>
                <dt className="text-ml-cream-dim">{copy.fiscal.zip}</dt><dd className="m-0">{profile.zip}</dd>
                <dt className="text-ml-cream-dim">{copy.fiscal.cfdiUse}</dt><dd className="m-0">{profile.cfdiUse} — {cfdiUseName}</dd>
                <dt className="text-ml-cream-dim">{copy.fiscal.email}</dt><dd className="m-0">{profile.email ?? accountEmail}</dd>
              </dl>
              <button
                type="button"
                onClick={() => { setNotice(null); setEditing(true); }}
                className="px-5 py-2.5 border border-ml-border text-ml-cream bg-transparent font-bebas tracking-wide cursor-pointer"
              >
                {copy.fiscal.edit}
              </button>
            </div>
          )}
        </section>

        <section>
          <h2 className={H2_CLASS}>{copy.charges.title}</h2>
          <ChargeList charges={charges} onInvoice={startInvoice} />
        </section>
      </div>

      {confirming && profile && (
        <InvoiceConfirm
          charge={confirming}
          profile={profile}
          onInvoiced={({ charges: next }) => {
            setCharges(next);
            setConfirmChargeId(null);
            setNotice({ kind: 'invoiced', email: profile.email ?? accountEmail });
          }}
          onRejected={(rejection) => rejected(confirming.id, rejection)}
          onCancel={() => setConfirmChargeId(null)}
          onUnauthorized={() => toLogin(confirming.id)}
        />
      )}
    </div>
  );
}
