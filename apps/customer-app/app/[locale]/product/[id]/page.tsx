import { cache } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { productRepository } from '@/lib/repositories/product.repository';
import ProductClient from '@/components/ProductClient';
import { SITE_URL, buildAlternates } from '@/lib/seo';
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
  const lang = locale as Lang;
  const title = `${product.name[lang]} · ${t('productTitle')}`;
  const description = `${product.name[lang]} — ${product.flav[lang]}. ${t('productDesc')}`;
  const alternates = buildAlternates(`/product/${id}`, locale);
  const image = `${SITE_URL}${product.img}`;

  return {
    title,
    description,
    alternates,
    openGraph: {
      type: 'website',
      url: alternates.canonical,
      title,
      description,
      images: [{ url: image, alt: product.name[lang] }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
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

  const alternates = buildAlternates(`/product/${id}`, locale);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name[lang],
    description: `${product.name[lang]} — ${product.flav[lang]}`,
    image: `${SITE_URL}${product.img}`,
    url: alternates.canonical,
    brand: { '@type': 'Brand', name: 'Mucho Loco Gym' },
    offers: {
      '@type': 'Offer',
      url: alternates.canonical,
      priceCurrency: 'MXN',
      price: product.price,
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductClient product={product} siblings={siblings} lang={lang} />
    </>
  );
}
