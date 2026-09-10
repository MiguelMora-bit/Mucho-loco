import type { SubmitEvent } from 'react';
import type { Translations } from '@mucho-loco/types';

interface ConfirmFormProps {
  t: Translations;
  email: string;
  loading: boolean;
  resent: boolean;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  onResend: () => void;
}

export function ConfirmForm({ t, email, loading, resent, onSubmit, onResend }: ConfirmFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <p className="text-ml-cream-dim text-xs mb-4">
        {t.account.confirm.sentPrefix} <b className="text-ml-cream">{email}</b>
      </p>
      <div className="field">
        <label>{t.account.confirm.codeLabel}</label>
        <input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required />
      </div>
      <button className="submit-btn" type="submit" disabled={loading}>
        {loading ? t.account.confirm.submitting : t.account.confirm.submit}
      </button>
      <p className="terms">
        <button type="button" className="bg-transparent border-none text-ml-cream-dim underline cursor-pointer text-xs" onClick={onResend} disabled={loading}>
          {t.account.confirm.resend}
        </button>
        {resent && <span className="text-ml-cream-dim text-xs"> — {t.account.confirm.resent}</span>}
      </p>
    </form>
  );
}
