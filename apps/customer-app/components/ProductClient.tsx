'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { PRODUCT_CATS } from '@/lib/data';
import { useT } from '@/lib/hooks/useT';
import { Gallery, Info, RelatedProducts } from './product';
import type { Product, Lang } from '@mucho-loco/types';

interface ProductClientProps {
  product: Product;
  siblings: Product[];
  lang: Lang;
}

export default function ProductClient({ product, siblings, lang }: ProductClientProps) {
  const t = useT();
  const catLabel = PRODUCT_CATS[lang][product.cat] || product.cat.toUpperCase();

  return (
    <div className="bg-ml-black pb-20">
      <nav className="pd-nav">
        <Link className="brand" href="/">
          <Image src="/assets/bull-head.png" alt="" width={44} height={44} />
          <div className="name">MUCHO <span>LOCO</span></div>
        </Link>
        <span className="crumbs">
          <Link href="/">{t.product.store}</Link> · {catLabel} · {product.name}
        </span>
        <span className="grow" />
        <Link href="/" className="back">← {t.product.back}</Link>
      </nav>

      <div className="pd-wrap">
        <div className="pd-main">
          <Gallery product={product} />
          <Info product={product} catLabel={catLabel} t={t} />
        </div>

        <RelatedProducts siblings={siblings} t={t} />
      </div>
    </div>
  );
}
