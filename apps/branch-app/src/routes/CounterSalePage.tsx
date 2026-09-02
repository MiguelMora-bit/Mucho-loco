import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProductSaleTab } from './counter/ProductSaleTab';
import { MembershipTab } from './counter/MembershipTab';

type Tab = 'products' | 'membership';

export function CounterSalePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('products');

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{t('counter.title')}</h1>
      <div className="flex gap-1 mb-6 border-b border-ml-border">
        <button
          onClick={() => setTab('products')}
          className={
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px ' +
            (tab === 'products' ? 'border-ml-red text-ml-cream' : 'border-transparent text-ml-cream-dim')
          }
        >
          {t('counter.productsTab')}
        </button>
        <button
          onClick={() => setTab('membership')}
          className={
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px ' +
            (tab === 'membership' ? 'border-ml-red text-ml-cream' : 'border-transparent text-ml-cream-dim')
          }
        >
          {t('counter.membershipTab')}
        </button>
      </div>

      {tab === 'products' ? <ProductSaleTab /> : <MembershipTab />}
    </div>
  );
}
