import type { SubmitEvent } from 'react';
import type { Translations } from '@mucho-loco/types';
import { SocialButtons } from './SocialButtons';

interface SignupFormProps {
  t: Translations;
  loading: boolean;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  next: string;
}

export function SignupForm({ t, loading, onSubmit, next }: SignupFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <div className="field">
        <label>{t.account.signup.nameLabel}</label>
        <input name="name" type="text" placeholder="Diego Ramírez" required />
      </div>
      <div className="field">
        <label>{t.account.signup.emailLabel}</label>
        <input name="email" type="email" placeholder="bestia@email.com" required />
      </div>
      <div className="field-row">
        <div className="field">
          <label>{t.account.signup.passwordLabel}</label>
          <input name="password" type="password" placeholder="••••••••" required />
        </div>
        {/* Spec 007: el canal de los avisos (vencimiento, pedido listo). */}
        <div className="field">
          <label htmlFor="signup-phone">{t.account.signup.phoneLabel}</label>
          <input id="signup-phone" name="phone" type="tel" autoComplete="tel" placeholder="55 1234 5678" required />
        </div>
      </div>
      <p className="text-xs text-ml-cream-dim -mt-2 mb-4">{t.account.signup.phoneNote}</p>
      <button className="submit-btn" type="submit" disabled={loading}>
        {loading ? t.account.signup.submitting : t.account.signup.submit}
      </button>
      <div className="or-divider">{t.account.signup.orDivider}</div>
      <SocialButtons next={next} />
      <p className="terms">{t.account.signup.termsPrefix} <a href="#">{t.account.signup.termsLink}</a> {t.account.signup.termsAnd} <a href="#">{t.account.signup.privacyLink}</a>. {t.account.signup.termsSuffix}</p>
    </form>
  );
}
