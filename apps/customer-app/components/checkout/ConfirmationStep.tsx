import { Link } from '@/i18n/routing';

interface ConfirmationStepProps {
  delivery: 'pickup' | 'home';
}

export function ConfirmationStep({ delivery }: ConfirmationStepProps) {
  return (
    <div className="confirm-screen">
      <div className="text-[80px] mb-6">🔥</div>
      <h1 className="font-display text-[clamp(48px,6vw,80px)] leading-[0.95] mb-4">
        ¡PEDIDO<br /><span className="text-ml-red">CONFIRMADO!</span>
      </h1>
      <p className="text-ml-cream-dim text-base max-w-[480px] mx-auto mb-8">
        Tu confirmación llegará por email. {delivery === 'pickup' ? 'Listo para retiro en 24–48h.' : 'Envío en 2–3 días hábiles.'}
      </p>
      <div className="flex gap-3.5 justify-center flex-wrap">
        <Link href="/dashboard" className="btn-primary inline-block no-underline px-8 py-4 font-display text-xl tracking-[0.06em] bg-ml-red text-white">VER MI CUENTA</Link>
        <Link href="/" className="inline-block no-underline px-8 py-4 font-display text-xl tracking-[0.06em] border border-ml-border text-ml-cream">SEGUIR COMPRANDO</Link>
      </div>
    </div>
  );
}
