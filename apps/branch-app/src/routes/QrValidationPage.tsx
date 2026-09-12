import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { qrAccessRepository } from '../lib/repositories/qrAccess.repository';
import type { QrValidationResult } from '../lib/repositories/qrAccess.repository';
import { getCurrentBranchId } from '../lib/currentBranch';
import { QrCameraScanner } from '../components/QrCameraScanner';
import type { MemberAccessRecord } from '@mucho-loco/types';

// Demo codes — los dos primeros son los QR reales de customer-app (ver
// lib/data.ts): Diego (all gyms) siempre pasa, Valeria (single, Condesa) debe
// ser rechazada acá porque el staff de prueba está en Roma Sur.
const DEMO_CODES = ['ML-DIEGO-2026-ALLGYMS', 'ML-VALERIA-2026-CONDESA', 'ML-QR-ANA02', 'ML-QR-CARLOS03'];

// Socios dados de alta con huella en vez de QR (sin la app) — ver lib/data.ts.
// Rosa (all gyms) siempre pasa; Luis (single, Interlomas) debe ser rechazado
// acá porque el staff de prueba está en Roma Sur.
const DEMO_FINGERPRINTS = ['FP-DEMO-ROSA', 'FP-DEMO-LUIS'];

export function QrValidationPage() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<QrValidationResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [fingerprintId, setFingerprintId] = useState('');

  const STATUS_COPY: Record<MemberAccessRecord['status'], { label: string; className: string }> = {
    active: { label: t('qr.statusActive'), className: 'bg-ml-green/10 border-ml-green text-ml-green' },
    grace: { label: t('qr.statusGrace'), className: 'bg-ml-orange/10 border-ml-orange text-ml-orange' },
    expired: { label: t('qr.statusExpired'), className: 'bg-ml-red/10 border-ml-red text-ml-red' },
  };

  async function validate(qrCode: string) {
    if (!qrCode.trim() || checking) return;
    setChecking(true);
    setResult(null);
    try {
      const outcome = await qrAccessRepository.validate(qrCode, getCurrentBranchId());
      setResult(outcome);
    } finally {
      setChecking(false);
      setCode('');
      inputRef.current?.focus();
    }
  }

  async function validateFingerprint(scannedId: string) {
    if (!scannedId.trim() || checking) return;
    setChecking(true);
    setResult(null);
    try {
      const outcome = await qrAccessRepository.validateByFingerprint(scannedId, getCurrentBranchId());
      setResult(outcome);
    } finally {
      setChecking(false);
      setFingerprintId('');
    }
  }

  // Mientras se muestra un resultado, un frame nuevo de la cámara no dispara
  // otra validación — evita re-escanear el mismo QR en bucle. Hay que limpiar
  // el resultado ("Escanear otro") antes de que un scan cuente de nuevo.
  function handleCameraScan(scanned: string) {
    if (result || checking) return;
    validate(scanned);
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">{t('qr.title')}</h1>
      <p className="text-ml-cream-dim text-sm mb-6">{t('qr.instructions')}</p>

      <QrCameraScanner onScan={handleCameraScan} />

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

      <div className="flex gap-2 mb-8 flex-wrap">
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

      <h2 className="text-lg font-bold mb-1 border-t border-ml-border pt-6">{t('qr.fingerprintSectionTitle')}</h2>
      <p className="text-ml-cream-dim text-sm mb-4">{t('qr.fingerprintInstructions')}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          validateFingerprint(fingerprintId);
        }}
        className="flex gap-2 mb-4"
      >
        <input
          value={fingerprintId}
          onChange={(e) => setFingerprintId(e.target.value)}
          placeholder={t('qr.fingerprintPlaceholder')}
          className="flex-1 bg-ml-card border border-ml-border rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-ml-red"
        />
        <button
          type="submit"
          disabled={checking || !fingerprintId.trim()}
          className="px-4 py-2 rounded bg-ml-red text-ml-cream font-medium disabled:opacity-40"
        >
          {checking ? t('qr.validating') : t('qr.fingerprintValidate')}
        </button>
      </form>

      <div className="flex gap-2 mb-8 flex-wrap">
        {DEMO_FINGERPRINTS.map((id) => (
          <button
            key={id}
            onClick={() => validateFingerprint(id)}
            className="text-xs font-mono px-2 py-1 rounded border border-ml-border text-ml-cream-dim hover:text-ml-cream"
          >
            {id}
          </button>
        ))}
      </div>

      {result && (
        <div className="rounded border p-6 text-center border-ml-border bg-ml-card">
          {result.outcome === 'not_found' && (
            <>
              <div className="text-4xl mb-2">✕</div>
              <div className="font-bold text-ml-red">{t('qr.notFound')}</div>
              <p className="text-ml-cream-dim text-sm mt-1">{t('qr.notFoundNote')}</p>
            </>
          )}

          {result.outcome === 'wrong_branch' && (
            <>
              <div className="text-4xl mb-2">⛔</div>
              <div className="inline-block px-2 py-1 rounded border font-mono text-xs uppercase mb-3 bg-ml-red/10 border-ml-red text-ml-red">
                {t('qr.wrongBranch')}
              </div>
              <div className="font-medium text-lg">{result.record.memberName}</div>
              <p className="text-ml-cream-dim text-sm mt-1">
                {t('qr.wrongBranchNote')} <b>{result.record.homeBranchName}</b>
              </p>
            </>
          )}

          {result.outcome === 'expired' && (
            <>
              <div className="text-4xl mb-2">✕</div>
              <div className="inline-block px-2 py-1 rounded border font-mono text-xs uppercase mb-3 bg-ml-red/10 border-ml-red text-ml-red">
                {t('qr.statusExpired')}
              </div>
              <div className="font-medium text-lg">{result.record.memberName}</div>
              <p className="text-ml-cream-dim text-sm mt-1">
                {t('qr.expiredOn')} {result.record.expiresAt}
              </p>
            </>
          )}

          {result.outcome === 'valid' && (
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

          <button
            onClick={() => setResult(null)}
            className="mt-4 px-3 py-1.5 rounded border border-ml-border text-xs text-ml-cream-dim hover:text-ml-cream"
          >
            {t('qr.scanNext')}
          </button>
        </div>
      )}
    </div>
  );
}
