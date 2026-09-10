'use client';

import { useState } from 'react';
import type { SubmitEvent } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import type { AuthUser, Translations } from '@mucho-loco/types';
import { Link, useRouter } from '@/i18n/routing';
import { useFireCanvas } from '../lib/hooks/useFireCanvas';
import { useAuthStore } from '../lib/stores/auth.store';
import { postJson, ApiError } from '../lib/api-client';
import { NEXT_PARAM } from '../lib/auth';
import { useT } from '../lib/hooks/useT';
import { LoginForm, SignupForm, ConfirmForm } from './account';

function errorMessageFor(t: Translations, code?: string): string {
  switch (code) {
    case 'USER_EXISTS': return t.account.errors.userExists;
    case 'INVALID_PASSWORD': return t.account.errors.invalidPassword;
    case 'NOT_CONFIRMED': return t.account.errors.notConfirmed;
    case 'WRONG_CREDENTIALS': return t.account.errors.wrongCredentials;
    case 'CODE_MISMATCH': return t.account.errors.codeMismatch;
    case 'CODE_EXPIRED': return t.account.errors.codeExpired;
    case 'TOO_MANY_ATTEMPTS': return t.account.errors.tooManyAttempts;
    default: return t.account.errorLogin;
  }
}

interface PendingConfirm {
  email: string;
  password: string;
}

export default function AccountClient() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get(NEXT_PARAM) || '/dashboard';
  const [tab, setTab] = useState<'login' | 'signup' | 'confirm'>('login');
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fireRef = useFireCanvas({ count: 70 });

  const setUser = useAuthStore((s) => s.setUser);

  function onSuccess(user: AuthUser) {
    setUser(user);
    router.push(nextPath as '/');
  }

  async function performLogin(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await postJson<{ ok: boolean; user: AuthUser }>('/api/auth/login', { email, password });
      onSuccess(data.user);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NOT_CONFIRMED') {
        setPendingConfirm({ email, password });
        setResent(false);
        setTab('confirm');
      } else {
        setError(err instanceof ApiError ? errorMessageFor(t, err.code) : t.common.connectionError);
      }
    } finally {
      setLoading(false);
    }
  }

  async function performRegister(name: string, email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      await postJson<{ ok: boolean }>('/api/auth/register', { email, password, name });
      setPendingConfirm({ email, password });
      setResent(false);
      setTab('confirm');
    } catch (err) {
      setError(err instanceof ApiError ? errorMessageFor(t, err.code) : t.common.connectionError);
    } finally {
      setLoading(false);
    }
  }

  async function performConfirm(code: string) {
    if (!pendingConfirm) return;
    setLoading(true);
    setError(null);
    try {
      const data = await postJson<{ ok: boolean; user?: AuthUser }>('/api/auth/confirm', {
        email: pendingConfirm.email,
        code,
        password: pendingConfirm.password,
      });
      if (data.user) {
        onSuccess(data.user);
      } else {
        setPendingConfirm(null);
        setTab('login');
      }
    } catch (err) {
      setError(err instanceof ApiError ? errorMessageFor(t, err.code) : t.common.connectionError);
    } finally {
      setLoading(false);
    }
  }

  async function performResend() {
    if (!pendingConfirm) return;
    setLoading(true);
    setError(null);
    try {
      await postJson<{ ok: boolean }>('/api/auth/resend-code', { email: pendingConfirm.email });
      setResent(true);
    } catch (err) {
      setError(err instanceof ApiError ? errorMessageFor(t, err.code) : t.common.connectionError);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoginSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = (form.get('email') as string | null) ?? '';
    const password = (form.get('password') as string | null) ?? '';
    await performLogin(email, password);
  }

  async function handleSignupSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get('name') as string | null) ?? '';
    const email = (form.get('email') as string | null) ?? '';
    const password = (form.get('password') as string | null) ?? '';
    await performRegister(name, email, password);
  }

  async function handleConfirmSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const code = (form.get('code') as string | null) ?? '';
    await performConfirm(code);
  }

  // El login social todavía no tiene un IdP real detrás (pendiente decidir qué
  // redes — ver CLAUDE.md raíz); intentarlo hoy siempre cae en credenciales
  // inválidas contra Cognito, lo cual es el comportamiento correcto por ahora.
  const handleSocialLogin = () => performLogin('bestia@mucholoco.mx', '');

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

          {tab !== 'confirm' && (
            <div className="auth-tabs">
              <button className={'auth-tab' + (tab === 'login' ? ' active' : '')} onClick={() => setTab('login')}>{t.account.loginTab}</button>
              <button className={'auth-tab' + (tab === 'signup' ? ' active' : '')} onClick={() => setTab('signup')}>{t.account.signupTab}</button>
            </div>
          )}

          {error && <p className="text-ml-red text-xs font-mono mb-4">{error}</p>}

          {tab === 'login' && (
            <LoginForm t={t} loading={loading} onSubmit={handleLoginSubmit} onSocialLogin={handleSocialLogin} onSwitchToSignup={() => setTab('signup')} />
          )}
          {tab === 'signup' && (
            <SignupForm t={t} loading={loading} onSubmit={handleSignupSubmit} onSocialLogin={handleSocialLogin} />
          )}
          {tab === 'confirm' && pendingConfirm && (
            <ConfirmForm t={t} email={pendingConfirm.email} loading={loading} resent={resent} onSubmit={handleConfirmSubmit} onResend={performResend} />
          )}
        </div>
      </main>
    </div>
  );
}
