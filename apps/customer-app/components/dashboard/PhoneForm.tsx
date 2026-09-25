'use client';
import { useState, type FormEvent } from 'react';
import type { Translations } from '@mucho-loco/types';
import { toE164 } from '@mucho-loco/customer-core/phone';

interface PhoneFormProps {
  t: Translations;
  /** Guarda el teléfono ya normalizado; si falla, el formulario lo dice. */
  onSave: (phone: string) => Promise<void>;
  onCancel?: () => void;
}

const INPUT_CLASS = 'flex-1 min-w-0 px-3 py-2.5 bg-ml-black border border-ml-border text-ml-cream text-sm focus:outline-none focus:border-ml-red';
const BUTTON_CLASS = 'px-5 py-2.5 bg-ml-red text-ml-cream font-bebas tracking-wide text-sm border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Completar o cambiar el teléfono (spec 015). Se valida con `toE164` antes de
 * mandar nada — el mismo criterio que el registro y que la ruta del servidor.
 */
export function PhoneForm({ t, onSave, onCancel }: PhoneFormProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const phone = toE164(value);
    if (!phone) {
      setError(t.dashboard.phone.invalid);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(phone);
    } catch {
      setError(t.dashboard.phone.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2" noValidate>
      <label htmlFor="member-phone" className="sr-only">{t.dashboard.phone.label}</label>
      <div className="flex gap-2">
        <input
          id="member-phone"
          type="tel"
          autoComplete="tel"
          placeholder={t.dashboard.phone.placeholder}
          aria-label={t.dashboard.phone.label}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={INPUT_CLASS}
        />
        <button type="submit" disabled={saving} className={BUTTON_CLASS}>
          {saving ? t.dashboard.phone.saving : t.dashboard.phone.save}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-3 text-xs text-ml-cream-dim underline bg-transparent border-none cursor-pointer">
            {t.dashboard.phone.cancel}
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-ml-red-bright mt-1">{error}</p>}
    </form>
  );
}
