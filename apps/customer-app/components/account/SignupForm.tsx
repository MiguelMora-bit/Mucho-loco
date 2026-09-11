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
        <div className="field">
          <label>{t.account.signup.birthdayLabel}</label>
          <input name="birthday" type="date" required />
        </div>
      </div>
      <button className="submit-btn" type="submit" disabled={loading}>
        {loading ? t.account.signup.submitting : t.account.signup.submit}
      </button>
      <div className="or-divider">{t.account.signup.orDivider}</div>
      <SocialButtons next={next} />
      <p className="terms">{t.account.signup.termsPrefix} <a href="#">{t.account.signup.termsLink}</a> {t.account.signup.termsAnd} <a href="#">{t.account.signup.privacyLink}</a>. {t.account.signup.termsSuffix}</p>
    </form>
  );
}
