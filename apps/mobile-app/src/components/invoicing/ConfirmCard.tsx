import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { Cfdi, FiscalProfile, MemberCharge } from '@mucho-loco/types';
import { invoicingErrorOf, type InvoicingRejection } from '@mucho-loco/customer-core/invoicing-errors';
import { formatDateTime } from '@mucho-loco/customer-core/dates';
import { formatMoney } from '@mucho-loco/customer-core/pricing';
import { Body, Button, Card, Heading, Mono } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { invoicingRepository } from '@/lib/repositories';
import { colors, space } from '@/theme';

interface ConfirmCardProps {
  email: string;
  charge: MemberCharge;
  profile: FiscalProfile;
  onInvoiced: (cfdi: Cfdi) => void;
  /** `null` = no fue un rechazo de negocio (red, 500). */
  onRejected: (rejection: InvoicingRejection | null) => void;
  onCancel: () => void;
}

/** Resumen antes de timbrar: una factura emitida no se corrige desde el app. */
export function ConfirmCard({ email, charge, profile, onInvoiced, onRejected, onCancel }: ConfirmCardProps) {
  const { t, lang } = useT();
  const copy = t.invoicing.confirm;
  const [sending, setSending] = useState(false);
  // Un doble toque llega antes de que el botón se pinte deshabilitado.
  const inFlight = useRef(false);

  async function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    try {
      onInvoiced(await invoicingRepository.invoiceCharge(email, charge.id));
    } catch (e) {
      onRejected(invoicingErrorOf(e));
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Heading>{copy.title}</Heading>
      <Mono>{copy.chargeLabel}</Mono>
      <Body style={styles.cream}>{charge.description}</Body>
      <Body>{formatDateTime(charge.paidAt, lang)} · {formatMoney(charge.total, lang)}</Body>
      <Mono>{copy.fiscalLabel}</Mono>
      <Body style={styles.cream}>{profile.legalName}</Body>
      <Body>{profile.taxId} · {profile.taxSystem} · {t.invoicing.fiscal.zip} {profile.zip} · {profile.cfdiUse}</Body>
      <Body style={styles.warning}>{copy.warning}</Body>
      <Button title={sending ? copy.confirming : copy.confirm} onPress={confirm} loading={sending} />
      <Button title={copy.cancel} variant="outline" onPress={onCancel} disabled={sending} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.xs, borderColor: colors.red },
  cream: { color: colors.cream },
  warning: { color: colors.cream, borderWidth: 1, borderColor: colors.border, padding: space.sm },
});
