import type { SubmitEvent } from 'react';
import type { Translations } from '@mucho-loco/types';
import { SocialButtons } from './SocialButtons';

interface LoginFormProps {
  t: Translations;
  loading: boolean;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  onSocialLogin: () => void;
  onSwitchToSignup: () => void;
}

export function LoginForm({ t, loading, onSubmit, onSocialLogin, onSwitchToSignup }: LoginFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <div className="field">
        <label>{t.account.login.emailLabel}</label>
        <input name="email" type="text" placeholder="bestia@email.com" autoComplete="username" />
      </div>
      <div className="field">
        <label>{t.account.login.passwordLabel}</label>
        <input name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
      </div>
      <div className="small-row">
        <label><input type="checkbox" /> {t.account.login.remember}</label>
        <a href="#">{t.account.login.forgot}</a>
      </div>
      <button className="submit-btn" type="submit" disabled={loading}>
        {loading ? t.account.login.submitting : t.account.login.submit}
      </button>
      <div className="or-divider">{t.account.login.orDivider}</div>
      <SocialButtons onClick={onSocialLogin} />
      <p className="terms">{t.account.login.firstTime} <button type="button" className="bg-transparent border-none text-ml-cream-dim underline cursor-pointer text-xs" onClick={onSwitchToSignup}>{t.account.login.createAccount}</button> {t.account.login.freeDayNote}</p>
    </form>
  );
}
