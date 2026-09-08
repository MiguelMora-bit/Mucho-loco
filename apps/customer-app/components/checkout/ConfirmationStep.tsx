import { Link } from '@/i18n/routing';
import type { Translations } from '@mucho-loco/types';

interface ConfirmationStepProps {
  t: Translations;
  delivery: 'pickup' | 'home';
}

export function ConfirmationStep({ t, delivery }: ConfirmationStepProps) {
  return (
    <div className="confirm-screen">
      <div className="text-[80px] mb-6">🔥</div>
      <h1 className="font-display text-[clamp(48px,6vw,80px)] leading-[0.95] mb-4">
        {t.checkout.confirmation.titleA}<br /><span className="text-ml-red">{t.checkout.confirmation.titleB}</span>
      </h1>
      <p className="text-ml-cream-dim text-base max-w-[480px] mx-auto mb-8">
        {t.checkout.confirmation.emailNote} {delivery === 'pickup' ? t.checkout.confirmation.pickupNote : t.checkout.confirmation.homeNote}
      </p>
      <div className="flex gap-3.5 justify-center flex-wrap">
        <Link href="/dashboard" className="inline-block no-underline px-8 py-4 font-display text-xl tracking-[0.06em] bg-ml-red text-ml-cream">{t.checkout.confirmation.viewAccount}</Link>
        <Link href="/" className="inline-block no-underline px-8 py-4 font-display text-xl tracking-[0.06em] border border-ml-border text-ml-cream">{t.checkout.confirmation.keepShopping}</Link>
      </div>
    </div>
  );
}
