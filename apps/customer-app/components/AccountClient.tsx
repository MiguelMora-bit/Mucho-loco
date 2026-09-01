'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { useFireCanvas } from '../lib/hooks/useFireCanvas';
import { useAsyncSubmit } from '../lib/hooks/useAsyncSubmit';
import { useAuthStore } from '../lib/stores/auth.store';
import { postJson } from '../lib/api-client';
import { NEXT_PARAM } from '../lib/auth';
import { LoginForm, SignupForm } from './account';

// Placeholder identity for the "social login" button and the empty-email
// fallback — there's no real OAuth/email provider behind this mock yet.
const DEMO_EMAIL = 'bestia@mucholoco.mx';

export default function AccountClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get(NEXT_PARAM) || '/dashboard';
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const fireRef = useFireCanvas({ count: 70 });
  const { loading, error, run } = useAsyncSubmit({ errorMessage: 'No pudimos iniciar tu sesión. Intenta de nuevo.' });

  const setUser = useAuthStore((s) => s.setUser);

  async function performLogin(email: string, name: string) {
    await run(async () => {
      await postJson<{ ok: boolean }>('/api/auth/login', { email, name });
      setUser({ email, name });
      router.push(nextPath as '/');
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
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
          ÚNETE AL<br />
          <span className="flame">CAOS.</span>
        </h1>
        <Image className="auth-mascot" src="/assets/bull-head.png" alt="" width={320} height={360} />
        <p className="auth-foot">Tu cuenta te abre las 15 sucursales, la tienda con retiro en local y tu crew. <br /><b className="text-ml-cream">Tú vienes con el hambre. Nosotros prendemos el fuego.</b></p>
      </aside>

      <main className="auth-form">
        <div className="auth-form-inner">
          <Link className="auth-back" href="/">← VOLVER AL SITIO</Link>

          <div className="auth-tabs">
            <button className={'auth-tab' + (tab === 'login' ? ' active' : '')} onClick={() => setTab('login')}>Iniciar sesión</button>
            <button className={'auth-tab' + (tab === 'signup' ? ' active' : '')} onClick={() => setTab('signup')}>Registrarme</button>
          </div>

          {error && <p className="text-ml-red text-xs font-mono mb-4">{error}</p>}

          {tab === 'login' && (
            <LoginForm loading={loading} onSubmit={handleSubmit} onSocialLogin={handleSocialLogin} onSwitchToSignup={() => setTab('signup')} />
          )}
          {tab === 'signup' && (
            <SignupForm loading={loading} onSubmit={handleSubmit} onSocialLogin={handleSocialLogin} />
          )}
        </div>
      </main>
    </div>
  );
}
