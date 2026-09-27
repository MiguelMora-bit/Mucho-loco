import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import type { NotificationPreferences } from '@mucho-loco/types';
import { Body, Heading, Mono } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { userRepository } from '@/lib/repositories';
import { colors, space } from '@/theme';

// react-native-web pinta el pulgar prendido con su propio verde (`activeThumbColor`,
// que no está en los tipos de RN); en iOS/Android basta `thumbColor`.
const WEB_THUMB = Platform.OS === 'web' ? ({ activeThumbColor: colors.cream } as object) : {};

/** Cada interruptor con su categoría de avisos (spec 053) — los mismos tres que la web. */
const TOGGLES = [
  { label: 'notifMembership', key: 'membership' },
  { label: 'notifOrderReady', key: 'orders' },
  { label: 'notifPayment', key: 'payments' },
] as const;

/**
 * Qué avisos de WhatsApp quiere el socio (spec 053). Se guarda al tocar; si
 * falla, el interruptor vuelve a su lugar. Carga aparte del panel: si esto
 * falla, el resto de la cuenta se sigue viendo.
 */
export function NotificationSettings({ email }: { email: string }) {
  const { t } = useT();
  const copy = t.dashboard.settings;
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    userRepository.getNotificationPreferences(email).then(
      (saved) => {
        if (!cancelled) setPreferences(saved);
      },
      (e: unknown) => console.error(e),
    );
    return () => {
      cancelled = true;
    };
  }, [email]);

  if (!preferences) return null;

  async function toggle(key: keyof NotificationPreferences) {
    if (!preferences) return;
    const before = preferences;
    const next = { ...before, [key]: !before[key] };
    setPreferences(next);
    setSaveError(false);
    try {
      setPreferences(await userRepository.updateNotificationPreferences(email, next));
    } catch (e) {
      console.error(e);
      setPreferences(before);
      setSaveError(true);
    }
  }

  return (
    <View style={styles.section}>
      <Heading>{copy.notificationsLabel}</Heading>
      <Mono>{copy.notificationsSub}</Mono>
      {TOGGLES.map(({ label, key }) => (
        <View key={key} style={styles.row}>
          <Body style={styles.label}>{copy[label]}</Body>
          <Switch
            accessibilityLabel={copy[label]}
            value={preferences[key]}
            onValueChange={() => toggle(key)}
            trackColor={{ false: colors.border, true: colors.red }}
            thumbColor={colors.cream}
            {...WEB_THUMB}
          />
        </View>
      ))}
      {saveError && <Body style={styles.error}>{copy.notifSaveError}</Body>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  label: { flex: 1, color: colors.cream },
  error: { color: colors.redBright },
});
