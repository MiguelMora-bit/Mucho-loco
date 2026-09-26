import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { qrAccessMethod, fingerprintAccessMethod, nameAccessMethod } from '../lib/access/methods';
import type { AccessMethod, CheckInResult } from '../lib/access/AccessMethod';
import { getCurrentBranchId } from '../lib/currentBranch';
import { QrCameraScanner } from '../components/QrCameraScanner';
import type { MemberAccessRecord } from '@mucho-loco/types';
import { formatDate, formatTime, langOf } from '../lib/dates';

// Demo codes — los dos primeros son los QR reales de customer-app (ver
// lib/data.ts): Diego (all gyms) siempre pasa, Valeria (single, Condesa) debe
// ser rechazada acá porque el staff de prueba está en Roma Sur.
const DEMO_CODES = ['ML-DIEGO-2026-ALLGYMS', 'ML-VALERIA-2026-CONDESA', 'ML-QR-ANA02', 'ML-QR-CARLOS03'];

// Socios dados de alta con huella en vez de QR (sin la app) — ver lib/data.ts.
// Rosa (all gyms) siempre pasa; Luis (single, Interlomas) debe ser rechazado
// acá porque el staff de prueba está en Roma Sur.
const DEMO_FINGERPRINTS = ['FP-DEMO-ROSA', 'FP-DEMO-LUIS'];

// Último recurso: buscar por nombre — ver lib/data.ts. "Carlos" es ambiguo a
// propósito (Carlos Mendoza y Carlos Vega), para mostrar cómo el staff
// desambigua antes de decidir el acceso.
const DEMO_NAMES = ['Diego', 'Carlos'];

export function QrValidationPage() {
  const { t, i18n } = useTranslation();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [fingerprintId, setFingerprintId] = useState('');
  const [nameQuery, setNameQuery] = useState('');

  const STATUS_COPY: Record<MemberAccessRecord['status'], { label: string; className: string }> = {
    active: { label: t('qr.statusActive'), className: 'bg-ml-green/10 border-ml-green text-ml-green' },
    grace: { label: t('qr.statusGrace'), className: 'bg-ml-orange/10 border-ml-orange text-ml-orange' },
    expired: { label: t('qr.statusExpired'), className: 'bg-ml-red/10 border-ml-red text-ml-red' },
  };

  // Cada sección de la pantalla (QR/huella/nombre) llama este único helper
  // con SU método — QrValidationPage no conoce las reglas de negocio de
  // ninguno, solo que todos implementan `AccessMethod` y devuelven el mismo
  // `CheckInResult` (ver lib/access/AccessMethod.ts).
  async function check(method: AccessMethod, query: string, onSettled?: () => void) {
    if (!query.trim() || checking) return;
    setChecking(true);
    setResult(null);
    try {
      const outcome = await method.checkAccess(query, getCurrentBranchId());
      setResult(outcome);
    } finally {
      setChecking(false);
      onSettled?.();
    }
  }

  function validate(qrCode: string) {
    return check(qrAccessMethod, qrCode, () => {
      setCode('');
      inputRef.current?.focus();
    });
  }

  function validateFingerprint(scannedId: string) {
    return check(fingerprintAccessMethod, scannedId, () => setFingerprintId(''));
  }

  function validateName(query: string) {
    return check(nameAccessMethod, query, () => setNameQuery(''));
  }

  // Desambiguar un resultado 'ambiguous' (solo lo produce la búsqueda por
  // nombre) es, ni más ni menos, resolver por el qrCode interno del
  // candidato que el staff confirmó con el socio — todo registro tiene uno,
  // incluso los dados de alta por huella (ver CLAUDE.md de este app).
  function selectCandidate(candidate: MemberAccessRecord) {
    return check(qrAccessMethod, candidate.qrCode);
  }

  // Mientras se muestra un resultado, un frame nuevo de la cámara no dispara
  // otra validación — evita re-escanear el mismo QR en bucle. Hay que limpiar
  // el resultado ("Validar otro") antes de que un scan cuente de nuevo.
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

      <h2 className="text-lg font-bold mb-1 border-t border-ml-border pt-6">{t('qr.nameSectionTitle')}</h2>
      <p className="text-ml-cream-dim text-sm mb-4">{t('qr.nameInstructions')}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          validateName(nameQuery);
        }}
        className="flex gap-2 mb-4"
      >
        <input
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          placeholder={t('qr.namePlaceholder')}
          className="flex-1 bg-ml-card border border-ml-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ml-red"
        />
        <button
          type="submit"
          disabled={checking || !nameQuery.trim()}
          className="px-4 py-2 rounded bg-ml-red text-ml-cream font-medium disabled:opacity-40"
        >
          {checking ? t('qr.validating') : t('qr.nameValidate')}
        </button>
      </form>

      <div className="flex gap-2 mb-8 flex-wrap">
        {DEMO_NAMES.map((name) => (
          <button
            key={name}
            onClick={() => validateName(name)}
            className="text-xs px-2 py-1 rounded border border-ml-border text-ml-cream-dim hover:text-ml-cream"
          >
            {name}
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

          {result.outcome === 'ambiguous' && (
            <>
              <div className="text-4xl mb-2">❓</div>
              <div className="inline-block px-2 py-1 rounded border font-mono text-xs uppercase mb-3 bg-ml-orange/10 border-ml-orange text-ml-orange">
                {t('qr.ambiguousTitle')}
              </div>
              <p className="text-ml-cream-dim text-sm mb-3">{t('qr.ambiguousNote')}</p>
              <div className="flex flex-col gap-2 text-left">
                {result.candidates.map((candidate) => (
                  <button
                    key={candidate.qrCode}
                    onClick={() => selectCandidate(candidate)}
                    className="flex items-center justify-between px-3 py-2 rounded border border-ml-border hover:border-ml-red text-sm"
                  >
                    <span>
                      {candidate.memberName} <span className="text-ml-cream-dim">· {candidate.homeBranchName}</span>
                    </span>
                    <span className="text-xs text-ml-cream-dim underline">{t('qr.selectCandidate')}</span>
                  </button>
                ))}
              </div>
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
                {t('qr.expiredOn')} {formatDate(result.record.expiresAt, langOf(i18n.language))}
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
                {result.record.status === 'expired' ? t('qr.expiredOn') : t('qr.expiresOn')}{' '}
                {formatDate(result.record.expiresAt, langOf(i18n.language))}
              </p>
              {/* Spec 012: validar registró la entrada. Un segundo escaneo el
                  mismo día pasa igual, pero avisa. Spec 020: si la primera fue
                  en OTRA sucursal, es la señal de un QR prestado — en rojo, y
                  HQ recibe la alerta. */}
              {!result.checkIn.firstToday && result.checkIn.firstBranchId !== getCurrentBranchId() ? (
                <p role="alert" data-shared-qr className="text-sm mt-2 font-medium text-ml-red">
                  {t('qr.sharedQrPrefix')} <b className="uppercase">{result.checkIn.firstBranch}</b> {t('qr.sharedQrAt')}{' '}
                  {formatTime(result.checkIn.visitedAt, langOf(i18n.language))}. {t('qr.sharedQrNote')}
                </p>
              ) : (
                <p className={'text-sm mt-2 font-medium ' + (result.checkIn.firstToday ? 'text-ml-green' : 'text-ml-orange')}>
                  {result.checkIn.firstToday ? t('qr.checkInRecorded') : t('qr.checkInRepeat')}{' '}
                  {formatTime(result.checkIn.visitedAt, langOf(i18n.language))}
                </p>
              )}
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
