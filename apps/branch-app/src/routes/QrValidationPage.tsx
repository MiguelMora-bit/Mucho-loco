import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { qrAccessRepository } from '../lib/repositories/qrAccess.repository';
import type { MemberAccessRecord } from '@mucho-loco/types';

type Result = { record: MemberAccessRecord } | { record: null } | null;

// Demo codes — a real QR scanner just types this plus Enter.
const DEMO_CODES = ['ML-QR-DIEGO01', 'ML-QR-ANA02', 'ML-QR-CARLOS03'];

export function QrValidationPage() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const STATUS_COPY: Record<MemberAccessRecord['status'], { label: string; className: string }> = {
    active: { label: t('qr.statusActive'), className: 'bg-ml-green/10 border-ml-green text-ml-green' },
    grace: { label: t('qr.statusGrace'), className: 'bg-ml-orange/10 border-ml-orange text-ml-orange' },
    expired: { label: t('qr.statusExpired'), className: 'bg-ml-red/10 border-ml-red text-ml-red' },
  };

  async function validate(qrCode: string) {
    if (!qrCode.trim()) return;
    setChecking(true);
    setResult(null);
    try {
      const record = await qrAccessRepository.validate(qrCode);
      setResult(record ? { record } : { record: null });
    } finally {
      setChecking(false);
      setCode('');
      inputRef.current?.focus();
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">{t('qr.title')}</h1>
      <p className="text-ml-cream-dim text-sm mb-6">
        {t('qr.instructions')}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          validate(code);
        }}
        className="flex gap-2 mb-4"
      >
        <input
          ref={inputRef}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('qr.placeholder')}
          className="flex-1 bg-ml-card border border-ml-border rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-ml-red"
        />
        <button
          type="submit"
          disabled={checking || !code.trim()}
          className="px-4 py-2 rounded bg-ml-red text-ml-cream font-medium disabled:opacity-40"
        >
          {checking ? t('qr.validating') : t('qr.validate')}
        </button>
      </form>

      <div className="flex gap-2 mb-8">
        {DEMO_CODES.map((c) => (
          <button
            key={c}
            onClick={() => validate(c)}
            className="text-xs font-mono px-2 py-1 rounded border border-ml-border text-ml-cream-dim hover:text-ml-cream"
          >
            {c}
          </button>
        ))}
      </div>

      {result && (
        <div className="rounded border p-6 text-center border-ml-border bg-ml-card">
          {result.record === null ? (
            <>
              <div className="text-4xl mb-2">✕</div>
              <div className="font-bold text-ml-red">{t('qr.notFound')}</div>
              <p className="text-ml-cream-dim text-sm mt-1">{t('qr.notFoundNote')}</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">{result.record.status === 'active' ? '✓' : result.record.status === 'grace' ? '⚠' : '✕'}</div>
              <div className={'inline-block px-2 py-1 rounded border font-mono text-xs uppercase mb-3 ' + STATUS_COPY[result.record.status].className}>
                {STATUS_COPY[result.record.status].label}
              </div>
              <div className="font-medium text-lg">{result.record.memberName}</div>
              <p className="text-ml-cream-dim text-sm mt-1">
                {result.record.status === 'expired' ? t('qr.expiredOn') : t('qr.expiresOn')} {result.record.expiresAt}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
