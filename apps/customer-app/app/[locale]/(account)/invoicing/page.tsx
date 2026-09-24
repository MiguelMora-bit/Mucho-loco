import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { invoicingRepository } from '@/lib/repositories/invoicing.repository';
import InvoicingClient from '@/components/invoicing/InvoicingClient';
import { buildAlternates } from '@/lib/seo';
import { getCurrentUserEmail } from '@/lib/session';
import { redirect } from '@/i18n/routing';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ charge?: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('panelTitle'),
    description: t('panelDesc'),
    alternates: buildAlternates('/invoicing', locale),
    robots: { index: false, follow: false },
  };
}

/**
 * Facturar (CFDI): datos fiscales + cobros del socio. Todo se lee aquí, en el
 * servidor, donde vive la cookie de sesión; las escrituras van por
 * `app/api/invoicing/*`. `?charge=<id>` abre directo la confirmación de ese
 * cobro (a eso regresa el socio si tuvo que capturar sus datos primero).
 */
export default async function InvoicingPage(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const email = await getCurrentUserEmail();
  if (!email) {
    return redirect({ href: '/account', locale });
  }
  const { charge } = await props.searchParams;
  const [fiscalProfile, charges] = await Promise.all([
    invoicingRepository.getFiscalProfile(email),
    invoicingRepository.getCharges(email),
  ]);

  return (
    <InvoicingClient
      fiscalProfile={fiscalProfile}
      charges={charges}
      // A dónde llegan las facturas si no captura otro correo (FR-005, FR-012).
      accountEmail={email}
      initialChargeId={charge ?? null}
    />
  );
}
