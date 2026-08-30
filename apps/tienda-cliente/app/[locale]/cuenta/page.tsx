'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { startFireCanvas } from '../../../lib/fire';
import { useAuthStore } from '../../../lib/stores/auth.store';

function CuentaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/panel';
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const fireRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (fireRef.current) {
      const stop = startFireCanvas(fireRef.current, { count: 70 });
      return stop;
    }
  }, []);

  const { setUser } = useAuthStore();

  async function performLogin(email: string, name: string) {
    setLoading(true);
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    setUser({ email, name });
    router.push(nextPath as '/');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = (form.get('email') as string | null) ?? 'bestia@mucholoco.mx';
    const name = (form.get('name') as string | null) ?? '';
    await performLogin(email, name);
  }

  return (
    <div className="auth-layout">
      <aside className="auth-side">
        <canvas ref={fireRef} className="auth-fire" />
        <Link className="top" href="/">
          <img src="/assets/bull-head.png" alt="" />
          <div className="name">MUCHO<br /><span>LOCO</span></div>
        </Link>
        <h1 className="auth-headline">
          ÚNETE AL<br />
          <span className="flame">CAOS.</span>
        </h1>
        <img className="auth-mascot" src="/assets/bull-head.png" alt="" />
        <p className="auth-foot">Tu cuenta te abre las 15 sucursales, la tienda con retiro en local y tu crew. <br /><b className="text-ml-cream">Tú vienes con el hambre. Nosotros prendemos el fuego.</b></p>
      </aside>

      <main className="auth-form">
        <div className="auth-form-inner">
          <Link className="auth-back" href="/">← VOLVER AL SITIO</Link>

          <div className="auth-tabs">
            <button className={'auth-tab' + (tab === 'login' ? ' active' : '')} onClick={() => setTab('login')}>Iniciar sesión</button>
            <button className={'auth-tab' + (tab === 'signup' ? ' active' : '')} onClick={() => setTab('signup')}>Registrarme</button>
          </div>

          {tab === 'login' && (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Email o usuario</label>
                <input name="email" type="text" placeholder="bestia@email.com" autoComplete="username" />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
              </div>
              <div className="small-row">
                <label><input type="checkbox" /> Mantener sesión</label>
                <a href="#">¿Olvidaste tu contraseña?</a>
              </div>
              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? 'ENTRANDO...' : 'PRENDER LA MECHA'}
              </button>
              <div className="or-divider">O ENTRA CON</div>
              <div className="social-grid">
                <button type="button" className="social-btn" onClick={() => performLogin('bestia@mucholoco.mx', '')}>
                  <svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.4-11.2-8L6.2 33C9.6 39.5 16.3 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.2 5.2c-.4.4 6.6-4.8 6.6-14.9 0-1.3-.1-2.4-.4-3.5z" /></svg>
                  Google
                </button>
                <button type="button" className="social-btn" onClick={() => performLogin('bestia@mucholoco.mx', '')}>
                  <svg viewBox="0 0 24 24"><path fill="#1877F2" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" /></svg>
                  Facebook
                </button>
              </div>
              <p className="terms">¿Es tu primera vez? <button type="button" className="bg-transparent border-none text-ml-cream-dim underline cursor-pointer text-xs" onClick={() => setTab('signup')}>Crea tu cuenta</button> y entrena el primer día gratis.</p>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Nombre completo</label>
                <input name="name" type="text" placeholder="Diego Ramírez" required />
              </div>
              <div className="field">
                <label>Email</label>
                <input name="email" type="email" placeholder="bestia@email.com" required />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Contraseña</label>
                  <input name="password" type="password" placeholder="••••••••" required />
                </div>
                <div className="field">
                  <label>Cumpleaños</label>
                  <input name="birthday" type="date" required />
                </div>
              </div>
              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? 'CREANDO CUENTA...' : 'SOLTAR LA BESTIA'}
              </button>
              <div className="or-divider">O REGÍSTRATE CON</div>
              <div className="social-grid">
                <button type="button" className="social-btn" onClick={() => performLogin('bestia@mucholoco.mx', '')}>
                  <svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.4-11.2-8L6.2 33C9.6 39.5 16.3 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.2 5.2c-.4.4 6.6-4.8 6.6-14.9 0-1.3-.1-2.4-.4-3.5z" /></svg>
                  Google
                </button>
                <button type="button" className="social-btn" onClick={() => performLogin('bestia@mucholoco.mx', '')}>
                  <svg viewBox="0 0 24 24"><path fill="#1877F2" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" /></svg>
                  Facebook
                </button>
              </div>
              <p className="terms">Al registrarte aceptas nuestros <a href="#">Términos</a> y la <a href="#">Política de Privacidad</a>. Tu primer día es gratis, bestia.</p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function CuentaPage() {
  return (
    <Suspense fallback={<div className="bg-ml-black min-h-screen" />}>
      <CuentaContent />
    </Suspense>
  );
}
