'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { PRODUCT_CATS } from '@/lib/data';
import { Gallery, Info, RelatedProducts } from './product';
import type { Product, Lang } from '@mucho-loco/types';

interface ProductClientProps {
  product: Product;
  siblings: Product[];
  lang: Lang;
}

export default function ProductClient({ product, siblings, lang }: ProductClientProps) {
  const catLabel = PRODUCT_CATS[lang][product.cat] || product.cat.toUpperCase();

  return (
    <div className="bg-ml-black pb-20">
      <nav className="pd-nav">
        <Link className="brand" href="/">
          <Image src="/assets/bull-head.png" alt="" width={44} height={44} />
          <div className="name">MUCHO <span>LOCO</span></div>
        </Link>
        <span className="crumbs">
          <Link href="/">{lang === 'es' ? 'Tienda' : 'Store'}</Link> · {catLabel} · {product.name}
        </span>
        <span className="grow" />
        <Link href="/" className="back">← {lang === 'es' ? 'VOLVER' : 'BACK'}</Link>
      </nav>

      <div className="pd-wrap">
        <div className="pd-main">
          <Gallery product={product} />
          <Info product={product} catLabel={catLabel} lang={lang} />
        </div>

        <RelatedProducts siblings={siblings} lang={lang} />
      </div>
    </div>
  );
}
