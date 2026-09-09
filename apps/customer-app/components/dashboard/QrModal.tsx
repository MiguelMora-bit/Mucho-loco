import { QRCodeSVG } from 'qrcode.react';
import type { Translations } from '@mucho-loco/types';

interface QrModalProps {
  t: Translations;
  open: boolean;
  onClose: () => void;
  accessCode: string;
}

export function QrModal({ t, open, onClose, accessCode }: QrModalProps) {
  if (!open) return null;

  return (
    <div className="qr-full" onClick={onClose}>
      <div className="w-[380px] max-w-[80vw] aspect-square bg-white p-6 shadow-orange grid place-items-center">
        <div className="text-center">
          <QRCodeSVG value={accessCode} size={260} marginSize={0} level="M" />
          <div className="mt-3 font-mono text-[9px] text-ml-muted tracking-wide-2xl">{accessCode}</div>
        </div>
      </div>
      <h2 className="font-display text-5xl mt-7">{t.dashboard.qr.title}</h2>
      <p className="text-ml-cream-dim mt-2 text-sm">{t.dashboard.qr.sub}</p>
      <button onClick={onClose} className="mt-6 px-7 py-3 border border-ml-border text-ml-cream font-bebas text-lg bg-transparent cursor-pointer">{t.dashboard.qr.close}</button>
    </div>
  );
}
