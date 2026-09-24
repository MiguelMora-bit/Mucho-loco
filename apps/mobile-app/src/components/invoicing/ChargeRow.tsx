import * as Linking from 'expo-linking';
import { StyleSheet, View } from 'react-native';
import type { MemberCharge } from '@mucho-loco/types';
import { whatsappUrl } from '@mucho-loco/customer-core/contact';
import { formatDateTime } from '@mucho-loco/customer-core/dates';
import { formatMoney } from '@mucho-loco/customer-core/pricing';
import { Body, Button, Card, Heading, Mono } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { colors, space } from '@/theme';

interface ChargeRowProps {
  charge: MemberCharge;
  onInvoice: () => void;
  onDownload: (format: 'pdf' | 'xml') => void;
  downloading: boolean;
}

/**
 * Un cobro con su estado. La descripción es el concepto fiscal registrado al
 * cobrar y se muestra tal cual, sin traducir (como en la web).
 */
export function ChargeRow({ charge, onInvoice, onDownload, downloading }: ChargeRowProps) {
  const { t, lang } = useT();
  const copy = t.invoicing;
  const { status, cfdiId, uuid } = charge.invoice;
  const date = formatDateTime(charge.paidAt, lang);

  return (
    <Card style={[styles.card, status === 'available' && styles.available]}>
      <Mono>{date}</Mono>
      <Body style={styles.cream}>{charge.description}</Body>
      <Heading>{formatMoney(charge.total, lang)}</Heading>
      <Mono style={status === 'available' ? styles.red : undefined}>{copy.status[status].label}</Mono>
      <Body>{copy.status[status].hint}</Body>

      {status === 'available' && <Button title={copy.charges.invoice} onPress={onInvoice} />}

      {/* Solo facturas individuales del socio: en `closed` el CFDI es la global. */}
      {status === 'invoiced' && cfdiId && (
        <>
          <View style={styles.row}>
            <Button title={copy.charges.downloadPdf} variant="outline" onPress={() => onDownload('pdf')} disabled={downloading} style={styles.fill} />
            <Button title={copy.charges.downloadXml} variant="outline" onPress={() => onDownload('xml')} disabled={downloading} style={styles.fill} />
          </View>
          {uuid && (
            <Button
              title={copy.charges.wrongData}
              variant="outline"
              onPress={() =>
                Linking.openURL(
                  whatsappUrl(copy.charges.whatsappMessage
                    .replace('{description}', charge.description)
                    .replace('{date}', date)
                    .replace('{uuid}', uuid)),
                )
              }
            />
          )}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.xs },
  available: { borderColor: colors.red },
  cream: { color: colors.cream },
  red: { color: colors.red },
  row: { flexDirection: 'row', gap: space.sm },
  fill: { flex: 1 },
});
