'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import type { FiscalProfile, Lang } from '@mucho-loco/types';
import {
  CFDI_USES,
  TAX_SYSTEMS,
  allowedCfdiUses,
  validateFiscalProfile,
  type FiscalProfileErrors,
} from '@mucho-loco/customer-core/fiscal';
import { useT } from '@/lib/hooks/useT';
import { ApiError, putJson } from '@/lib/api-client';
import { fill } from './fill';

const LABEL_CLASS = 'block font-mono text-10 text-ml-cream-dim uppercase tracking-wide-xl mb-2';
const INPUT_CLASS = 'w-full p-3.5 bg-ml-card border border-ml-border text-ml-cream';
const HELP_CLASS = 'text-xs text-ml-cream-dim mt-1.5';
const ERROR_CLASS = 'text-xs text-ml-red-bright mt-1.5';

const EMPTY: FiscalProfile = { taxId: '', legalName: '', taxSystem: '', zip: '', cfdiUse: '' as FiscalProfile['cfdiUse'], email: null };

interface FiscalProfileFormProps {
  initial: FiscalProfile | null;
  accountEmail: string;
  onSaved: (profile: FiscalProfile) => void;
  /** Sin `onCancel` (todavía no hay datos guardados) no hay botón de cancelar. */
  onCancel?: () => void;
  /** La sesión expiró a mitad del flujo. */
  onUnauthorized: () => void;
}

/**
 * Datos fiscales del socio, como vienen en su Constancia de Situación Fiscal.
 * Valida la FORMA aquí (misma función que la ruta) y filtra el uso de CFDI
 * según el régimen; el fondo (que el RFC exista y coincida) lo valida el SAT
 * al timbrar.
 */
export function FiscalProfileForm({ initial, accountEmail, onSaved, onCancel, onUnauthorized }: FiscalProfileFormProps) {
  const t = useT();
  const lang = useLocale() as Lang;
  const copy = t.invoicing.fiscal;
  const [value, setValue] = useState<FiscalProfile>(initial ?? EMPTY);
  const [errors, setErrors] = useState<FiscalProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const uses = allowedCfdiUses(value.taxSystem);

  function set<K extends keyof FiscalProfile>(key: K, next: FiscalProfile[K]) {
    setValue((current) => {
      const updated = { ...current, [key]: next };
      // Cambiar de régimen puede dejar inválido el uso elegido: se limpia para
      // que lo vuelva a elegir, en vez de mandar una combinación que el SAT rechaza.
      if (key === 'taxSystem' && !allowedCfdiUses(String(next)).includes(updated.cfdiUse)) {
        updated.cfdiUse = '' as FiscalProfile['cfdiUse'];
      }
      return updated;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFailure(null);
    const found = validateFiscalProfile(value);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setSaving(true);
    try {
      onSaved(await putJson<FiscalProfile>('/api/invoicing/fiscal-profile', value));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      if (err instanceof ApiError && err.code === 'INVALID_FISCAL_PROFILE') {
        setErrors((err.data?.fields ?? {}) as FiscalProfileErrors);
      } else {
        setFailure(t.invoicing.errors.connection);
      }
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof FiscalProfileErrors) => ({
    id: `fiscal-${key}`,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': `fiscal-${key}-hint`,
  });
  const hint = (key: keyof FiscalProfileErrors, help?: string) =>
    errors[key] ? (
      <p id={`fiscal-${key}-hint`} className={ERROR_CLASS}>{copy.errors[key]}</p>
    ) : help ? (
      <p id={`fiscal-${key}-hint`} className={HELP_CLASS}>{help}</p>
    ) : null;

  return (
    <form aria-label={copy.title} onSubmit={submit} noValidate className="bg-ml-card border border-ml-border p-6 grid gap-5">
      <div>
        <label className={LABEL_CLASS} htmlFor="fiscal-taxId">{copy.taxId}</label>
        <input
          {...field('taxId')}
          value={value.taxId}
          onChange={(e) => set('taxId', e.target.value)}
          autoComplete="off"
          className={INPUT_CLASS + ' uppercase'}
        />
        {hint('taxId', copy.taxIdHelp)}
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="fiscal-legalName">{copy.legalName}</label>
        <input
          {...field('legalName')}
          value={value.legalName}
          onChange={(e) => set('legalName', e.target.value)}
          className={INPUT_CLASS + ' uppercase'}
        />
        {hint('legalName', copy.legalNameHelp)}
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="fiscal-taxSystem">{copy.taxSystem}</label>
        <select {...field('taxSystem')} value={value.taxSystem} onChange={(e) => set('taxSystem', e.target.value)} className={INPUT_CLASS}>
          <option value="" disabled>{copy.taxSystemPlaceholder}</option>
          {TAX_SYSTEMS.map((s) => (
            <option key={s.key} value={s.key}>{s.key} — {s.name[lang]}</option>
          ))}
        </select>
        {hint('taxSystem')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={LABEL_CLASS} htmlFor="fiscal-zip">{copy.zip}</label>
          <input
            {...field('zip')}
            value={value.zip}
            onChange={(e) => set('zip', e.target.value)}
            inputMode="numeric"
            maxLength={5}
            className={INPUT_CLASS}
          />
          {hint('zip', copy.zipHelp)}
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="fiscal-cfdiUse">{copy.cfdiUse}</label>
          <select
            {...field('cfdiUse')}
            value={value.cfdiUse}
            onChange={(e) => set('cfdiUse', e.target.value as FiscalProfile['cfdiUse'])}
            className={INPUT_CLASS}
          >
            <option value="" disabled>{copy.cfdiUsePlaceholder}</option>
            {CFDI_USES.filter((u) => uses.includes(u.key)).map((u) => (
              <option key={u.key} value={u.key}>{u.key} — {u.name[lang]}</option>
            ))}
          </select>
          {hint('cfdiUse', value.taxSystem ? copy.cfdiUseFiltered : undefined)}
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="fiscal-email">{copy.email}</label>
        <input
          {...field('email')}
          type="email"
          value={value.email ?? ''}
          onChange={(e) => set('email', e.target.value)}
          className={INPUT_CLASS}
        />
        {hint('email', fill(copy.emailHelp, { email: accountEmail }))}
      </div>

      {failure && <p role="alert" className="text-sm text-ml-red-bright">{failure}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 p-4 bg-ml-red text-ml-cream font-display text-22 tracking-[0.04em] border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? copy.saving : copy.save}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-5 border border-ml-border text-ml-cream bg-transparent font-bebas tracking-wide cursor-pointer">
            {copy.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
