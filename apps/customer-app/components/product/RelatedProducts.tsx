import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { formatPrice } from '@/lib/pricing';
import type { Lang, Product, Translations } from '@mucho-loco/types';

interface RelatedProductsProps {
  siblings: Product[];
  t: Translations;
  lang: Lang;
}

export function RelatedProducts({ siblings, t, lang }: RelatedProductsProps) {
  if (siblings.length === 0) return null;

  return (
    <div className="mt-16">
      <div className="font-display text-[32px] mb-6">
        {t.product.moreFrom} <span className="text-ml-red">{t.product.theCategory}</span>
      </div>
      <div className="related-grid">
        {siblings.map(p => (
          <Link key={p.id} href={`/product/${p.id}` as '/product/[id]'} className="related-card">
            <div className="relative aspect-square">
              <Image src={p.img} alt={p.name[lang]} fill sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 25vw" className="object-cover" />
            </div>
            <div className="rc-body">
              <div className="rc-name">{p.name[lang]}</div>
              <div className="text-11 text-ml-cream-dim font-mono mt-0.5">{p.flav[lang]}</div>
              <div className="rc-price">{formatPrice(p.price)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
