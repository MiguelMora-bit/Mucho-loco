import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { productRepository } from '@/lib/repositories/product.repository';
import ProductClient from '@/components/ProductClient';
import type { Lang } from '@mucho-loco/types';

interface Props {
  params: { locale: string; id: string };
}

export default async function ProductPage({ params }: Props) {
  const { locale, id } = params;
  setRequestLocale(locale);
  const lang = locale as Lang;

  const product = await productRepository.getById(id);

  if (!product) {
    return (
      <div className="px-8 py-20 text-center">
        <h1 className="font-display text-5xl">PRODUCTO NO ENCONTRADO</h1>
        <Link href="/" className="text-ml-red font-mono text-sm">← VOLVER A LA TIENDA</Link>
      </div>
    );
  }

  const siblings = await productRepository.getSiblings(product.id, product.cat);

  return <ProductClient product={product} siblings={siblings} lang={lang} />;
}
