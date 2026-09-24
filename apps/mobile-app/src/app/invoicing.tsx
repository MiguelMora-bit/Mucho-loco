import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { FiscalProfile } from '@mucho-loco/types';
import type { InvoicingErrorCode, InvoicingRejection } from '@mucho-loco/customer-core/invoicing-errors';
import { CFDI_USES, TAX_SYSTEMS } from '@mucho-loco/customer-core/fiscal';
import { ChargeRow } from '@/components/invoicing/ChargeRow';
import { ConfirmCard } from '@/components/invoicing/ConfirmCard';
import { FiscalForm } from '@/components/invoicing/FiscalForm';
import { Body, Button, Card, Display, ErrorState, Heading, Loading, Mono, Screen } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { invoicingRepository } from '@/lib/repositories';
import { shareInvoiceFile } from '@/lib/share-file';
import { useSessionStore } from '@/lib/stores/session.store';
import { useResource } from '@/lib/use-resource';
import { colors, space } from '@/theme';

/** Rechazos que significan "el cobro cambió por fuera": la lista se recarga. */
const STALE: readonly InvoicingErrorCode[] = [
  'CHARGE_NOT_FOUND',
  'CHARGE_ALREADY_INVOICED',
  'INVOICING_WINDOW_CLOSED',
  'CHARGE_NOT_INVOICEABLE',
];

type Notice =
  | { kind: 'saved' }
  | { kind: 'invoiced'; email: string }
  | { kind: 'error'; text: string; detail?: string; fixChargeId?: string };

/**
 * Facturar — la misma funcionalidad que `/invoicing` de la web, sobre el mismo
 * contrato de customer-core (spec 002). Aquí no hay Route Handlers: el app
 * habla directo con el repositorio, con el token del llavero.
 */
export default function InvoicingScreen() {
  const { t, m, lang } = useT();
  const router = useRouter();
  const email = useSessionStore((s) => s.session?.email);
  const copy = t.invoicing;

  const load = useCallback(async () => {
    if (!email) return null;
    const [profile, charges] = await Promise.all([
      invoicingRepository.getFiscalProfile(email),
      invoicingRepository.getCharges(email),
    ]);
    return { profile, charges };
  }, [email]);
  const { state, reload } = useResource(load);

  const [profileOverride, setProfileOverride] = useState<FiscalProfile | null | undefined>(undefined);
  const [editing, setEditing] = useState<boolean | null>(null);
  const [pendingChargeId, setPendingChargeId] = useState<string | null>(null);
  const [confirmChargeId, setConfirmChargeId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [downloading, setDownloading] = useState(false);

  if (!email) {
    return (
      <Screen safeTop={false}>
        <Display>{copy.title}</Display>
        <Body>{m.invoicing.loginPrompt}</Body>
        <Button title={m.invoicing.login} onPress={() => router.push('/login')} />
      </Screen>
    );
  }
  if (state.status === 'loading') {
    return (
      <Screen safeTop={false}>
        <Loading />
      </Screen>
    );
  }
  if (state.status === 'error' || !state.data) {
    return (
      <Screen safeTop={false}>
        <ErrorState message={copy.errors.connection} retryLabel={t.error.retry} onRetry={reload} />
      </Screen>
    );
  }

  const { charges } = state.data;
  const profile = profileOverride === undefined ? state.data.profile : profileOverride;
  const showForm = editing ?? profile === null;
  const sessionEmail = email;

  function startInvoice(chargeId: string) {
    setNotice(null);
    if (!profile) {
      setPendingChargeId(chargeId);
      setEditing(true);
      return;
    }
    setConfirmChargeId(chargeId);
  }

  function fixData(chargeId: string) {
    setNotice(null);
    setConfirmChargeId(null);
    setPendingChargeId(chargeId);
    setEditing(true);
  }

  function saved(next: FiscalProfile) {
    setProfileOverride(next);
    setEditing(false);
    setNotice({ kind: 'saved' });
    if (pendingChargeId) {
      setConfirmChargeId(pendingChargeId);
      setPendingChargeId(null);
    }
  }

  function rejected(chargeId: string, rejection: InvoicingRejection | null) {
    setConfirmChargeId(null);
    if (rejection && STALE.includes(rejection.code)) reload();
    if (rejection?.code === 'FISCAL_PROFILE_REQUIRED') {
      setProfileOverride(null);
      fixData(chargeId);
      return;
    }
    setNotice({
      kind: 'error',
      text: rejection ? copy.errors[rejection.code] : copy.errors.connection,
      detail: rejection?.detail,
      fixChargeId: rejection?.code === 'FISCAL_DATA_REJECTED' ? chargeId : undefined,
    });
  }

  async function download(cfdiId: string, format: 'pdf' | 'xml') {
    setDownloading(true);
    try {
      await shareInvoiceFile(await invoicingRepository.downloadInvoice(sessionEmail, cfdiId, format));
    } catch {
      setNotice({ kind: 'error', text: m.invoicing.shareError });
    } finally {
      setDownloading(false);
    }
  }

  const confirming = confirmChargeId ? charges.find((c) => c.id === confirmChargeId) : undefined;

  return (
    <Screen safeTop={false}>
      <Display>{copy.title}</Display>
      <Body>{copy.subtitle}</Body>

      {notice?.kind === 'saved' && <Card><Body style={styles.cream}>{copy.fiscal.saved}</Body></Card>}
      {notice?.kind === 'invoiced' && (
        <Card><Body style={styles.cream}>{copy.confirm.success.replace('{email}', notice.email)}</Body></Card>
      )}
      {notice?.kind === 'error' && (
        <Card style={styles.errorCard}>
          <Body style={styles.error}>{notice.text}</Body>
          {/* El motivo del SAT tal cual: es lo que el socio tiene que corregir. */}
          {notice.detail && <Body style={styles.cream}>{notice.detail}</Body>}
          {notice.fixChargeId && <Button title={copy.errors.fixData} onPress={() => fixData(notice.fixChargeId!)} />}
        </Card>
      )}

      {confirming && profile && (
        <ConfirmCard
          email={email}
          charge={confirming}
          profile={profile}
          onInvoiced={() => {
            setConfirmChargeId(null);
            setNotice({ kind: 'invoiced', email: profile.email ?? email });
            reload();
          }}
          onRejected={(rejection) => rejected(confirming.id, rejection)}
          onCancel={() => setConfirmChargeId(null)}
        />
      )}

      <Heading>{copy.fiscal.title}</Heading>
      {showForm ? (
        <>
          {!profile && (
            <View>
              <Body style={styles.cream}>{copy.fiscal.emptyTitle}</Body>
              <Body>{copy.fiscal.emptyBody}</Body>
            </View>
          )}
          <FiscalForm
            email={email}
            initial={profile}
            onSaved={saved}
            onCancel={profile ? () => { setEditing(false); setPendingChargeId(null); } : undefined}
          />
        </>
      ) : (
        profile && (
          <Card style={styles.summary}>
            <Mono>{copy.fiscal.taxId}</Mono>
            <Body style={styles.cream}>{profile.taxId}</Body>
            <Mono>{copy.fiscal.legalName}</Mono>
            <Body style={styles.cream}>{profile.legalName}</Body>
            <Mono>{copy.fiscal.taxSystem}</Mono>
            <Body style={styles.cream}>{profile.taxSystem} — {TAX_SYSTEMS.find((s) => s.key === profile.taxSystem)?.name[lang]}</Body>
            <Mono>{copy.fiscal.cfdiUse}</Mono>
            <Body style={styles.cream}>{profile.cfdiUse} — {CFDI_USES.find((u) => u.key === profile.cfdiUse)?.name[lang]}</Body>
            <Mono>{copy.fiscal.email}</Mono>
            <Body style={styles.cream}>{profile.email ?? email}</Body>
            <Button title={copy.fiscal.edit} variant="outline" onPress={() => { setNotice(null); setEditing(true); }} />
          </Card>
        )
      )}

      <Heading>{copy.charges.title}</Heading>
      {charges.length === 0 && <Body>{copy.charges.empty}</Body>}
      {charges.map((charge) => (
        <ChargeRow
          key={charge.id}
          charge={charge}
          onInvoice={() => startInvoice(charge.id)}
          onDownload={(format) => charge.invoice.cfdiId && download(charge.invoice.cfdiId, format)}
          downloading={downloading}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cream: { color: colors.cream },
  error: { color: colors.redBright },
  errorCard: { borderColor: colors.red, gap: space.xs },
  summary: { gap: space.xs },
});
