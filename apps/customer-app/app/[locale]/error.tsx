'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('error');
  useEffect(() => {
    console.error('[customer-app] Page error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0606',
        color: '#f5e9dc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        fontFamily: 'monospace',
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>{t('title')}</h1>
      <p style={{ opacity: 0.7, marginBottom: 16, maxWidth: 480 }}>{error.message}</p>
      {error.digest && <p style={{ opacity: 0.4, fontSize: 12, marginBottom: 20 }}>digest: {error.digest}</p>}
      <button
        onClick={() => reset()}
        style={{ padding: '10px 20px', background: '#e1141c', color: 'white', border: 'none', cursor: 'pointer' }}
      >
        {t('retry')}
      </button>
    </div>
  );
}
