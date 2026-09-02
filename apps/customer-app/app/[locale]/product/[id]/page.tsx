import { cache } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { productRepository } from '@/lib/repositories/product.repository';
import ProductClient from '@/components/ProductClient';
import type { Lang } from '@mucho-loco/types';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

// generateMetadata and the page body both need the product for the same
// request — cache() dedupes them to a single productRepository.getById call.
const getProduct = cache((id: string) => productRepository.getById(id));

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { locale, id } = params;
  const product = await getProduct(id);
  if (!product) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: `${product.name[locale as Lang]} · ${t('productTitle')}`,
    description: t('productDesc'),
  };
}

export default async function ProductPage(props: Props) {
  const params = await props.params;
  const { locale, id } = params;
  setRequestLocale(locale);
  const lang = locale as Lang;

  const product = await getProduct(id);

  if (!product) {
    const t = await getTranslations({ locale, namespace: 'product' });
    return (
      <div className="px-8 py-20 text-center">
        <h1 className="font-display text-5xl">{t('notFound')}</h1>
        <Link href="/" className="text-ml-red font-mono text-sm">← {t('backToShop')}</Link>
      </div>
    );
  }

  const siblings = await productRepository.getSiblings(product.id, product.cat);

  return <ProductClient product={product} siblings={siblings} lang={lang} />;
}
