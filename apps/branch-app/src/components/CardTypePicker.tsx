import { useTranslation } from 'react-i18next';
import type { CardType } from '@mucho-loco/types';

const OPTIONS: CardType[] = ['credit', 'debit'];

/**
 * "¿Crédito o débito?" al cobrar con tarjeta (spec 009). El SAT distingue la
 * forma de pago del CFDI (04 crédito, 28 débito); la terminal lo dice en su
 * ticket. Obligatorio: quien lo usa no deja confirmar sin elegir.
 */
export function CardTypePicker({ value, onChange }: { value: CardType | null; onChange: (t: CardType) => void }) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={t('counter.cardType.label')} className="mt-2">
      <div className="text-xs font-mono uppercase text-ml-cream-dim mb-1.5">{t('counter.cardType.label')}</div>
      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={value === opt}
            onClick={() => onChange(opt)}
            className={
              'flex-1 py-1.5 rounded text-sm font-medium border ' +
              (value === opt ? 'bg-ml-red border-ml-red text-ml-cream' : 'border-ml-border text-ml-cream-dim')
            }
          >
            {t(`counter.cardType.${opt}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
