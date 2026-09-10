import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QrScanner from 'qr-scanner';

interface QrCameraScannerProps {
  /** Se llama con el texto decodificado en CADA frame que trae un QR — el caller decide si ignorarlo (ej. mientras ya muestra un resultado). */
  onScan: (code: string) => void;
}

/**
 * Cámara real de escaneo (qr-scanner, https://github.com/nimiq/qr-scanner) —
 * reusado por QrValidationPage (acceso) y PickupOrdersPage (recoger pedido).
 * El input manual tipo "lector físico" sigue existiendo en cada pantalla como
 * respaldo (sin permiso de cámara, o hardware dedicado de mostrador).
 */
export function QrCameraScanner({ onScan }: QrCameraScannerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const scanner = new QrScanner(
      videoRef.current,
      (result) => onScanRef.current(result.data),
      { highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 5 }
    );
    scannerRef.current = scanner;
    return () => {
      scanner.destroy();
      scannerRef.current = null;
    };
  }, []);

  async function startCamera() {
    setCameraError(null);
    try {
      await scannerRef.current?.start();
      setCameraOn(true);
    } catch {
      setCameraError(t('qrScanner.cameraError'));
    }
  }

  function stopCamera() {
    scannerRef.current?.stop();
    setCameraOn(false);
  }

  return (
    <div className="mb-4">
      <div className={'relative overflow-hidden rounded border border-ml-border bg-black ' + (cameraOn ? 'block' : 'hidden')}>
        <video ref={videoRef} muted playsInline className="w-full max-h-64 object-cover" />
      </div>

      {!cameraOn ? (
        <button
          type="button"
          onClick={startCamera}
          className="px-4 py-2 rounded border border-ml-border text-sm text-ml-cream-dim hover:text-ml-cream"
        >
          {t('qrScanner.start')}
        </button>
      ) : (
        <button
          type="button"
          onClick={stopCamera}
          className="mt-2 px-4 py-2 rounded border border-ml-border text-sm text-ml-cream-dim hover:text-ml-cream"
        >
          {t('qrScanner.stop')}
        </button>
      )}

      {cameraError && <p className="text-ml-red text-xs mt-2">{cameraError}</p>}
    </div>
  );
}
