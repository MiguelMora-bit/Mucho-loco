'use client';

import { useEffect } from 'react';

// Catches errors that escape app/[locale]/error.tsx — e.g. a crash in the
// root layout itself. Next.js requires this file to render its own
// <html>/<body> since it replaces the entire root layout when it fires.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[customer-app] Root error:', error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
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
        {/* No locale is available this far outside app/[locale] (see comment
            above), so both languages are shown stacked instead of picking one. */}
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Error crítico / Critical error 🔥</h1>
        <p style={{ opacity: 0.7, marginBottom: 16, maxWidth: 480 }}>{error.message}</p>
        {error.digest && <p style={{ opacity: 0.4, fontSize: 12, marginBottom: 20 }}>digest: {error.digest}</p>}
        <button
          onClick={() => reset()}
          style={{ padding: '10px 20px', background: '#e1141c', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Reintentar / Retry
        </button>
      </body>
    </html>
  );
}
