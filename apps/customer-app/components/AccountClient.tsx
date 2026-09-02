'use client';

import { useState } from 'react';
import type { SubmitEvent } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { useFireCanvas } from '../lib/hooks/useFireCanvas';
import { useAsyncSubmit } from '../lib/hooks/useAsyncSubmit';
import { useAuthStore } from '../lib/stores/auth.store';
import { postJson } from '../lib/api-client';
import { NEXT_PARAM } from '../lib/auth';
import { useT } from '../lib/hooks/useT';
import { LoginForm, SignupForm } from './account';

// Placeholder identity for the "social login" button and the empty-email
// fallback — there's no real OAuth/email provider behind this mock yet.
const DEMO_EMAIL = 'bestia@mucholoco.mx';

export default function AccountClient() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get(NEXT_PARAM) || '/dashboard';
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const fireRef = useFireCanvas({ count: 70 });
  const { loading, error, run } = useAsyncSubmit({
    errorMessage: t.account.errorLogin,
    connectionErrorMessage: t.common.connectionError,
  });

  const setUser = useAuthStore((s) => s.setUser);

  async function performLogin(email: string, name: string) {
    await run(async () => {
      await postJson<{ ok: boolean }>('/api/auth/login', { email, name });
      setUser({ email, name });
      router.push(nextPath as '/');
    });
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = (form.get('email') as string | null) ?? DEMO_EMAIL;
    const name = (form.get('name') as string | null) ?? '';
    await performLogin(email, name);
  }

  const handleSocialLogin = () => performLogin(DEMO_EMAIL, '');

  return (
    <div className="auth-layout">
      <aside className="auth-side">
        <canvas ref={fireRef} className="auth-fire" />
        <Link className="top" href="/">
          <Image src="/assets/bull-head.png" alt="" width={56} height={56} />
          <div className="name">MUCHO<br /><span>LOCO</span></div>
        </Link>
        <h1 className="auth-headline">
          {t.account.headlineA}<br />
          <span className="flame">{t.account.headlineB}</span>
        </h1>
        <Image className="auth-mascot" src="/assets/bull-head.png" alt="" width={320} height={360} />
        <p className="auth-foot">{t.account.tagline} <br /><b className="text-ml-cream">{t.account.taglineBold}</b></p>
      </aside>

      <main className="auth-form">
        <div className="auth-form-inner">
          <Link className="auth-back" href="/">← {t.account.backToSite}</Link>

          <div className="auth-tabs">
            <button className={'auth-tab' + (tab === 'login' ? ' active' : '')} onClick={() => setTab('login')}>{t.account.loginTab}</button>
            <button className={'auth-tab' + (tab === 'signup' ? ' active' : '')} onClick={() => setTab('signup')}>{t.account.signupTab}</button>
          </div>

          {error && <p className="text-ml-red text-xs font-mono mb-4">{error}</p>}

          {tab === 'login' && (
            <LoginForm t={t} loading={loading} onSubmit={handleSubmit} onSocialLogin={handleSocialLogin} onSwitchToSignup={() => setTab('signup')} />
          )}
          {tab === 'signup' && (
            <SignupForm t={t} loading={loading} onSubmit={handleSubmit} onSocialLogin={handleSocialLogin} />
          )}
        </div>
      </main>
    </div>
  );
}
