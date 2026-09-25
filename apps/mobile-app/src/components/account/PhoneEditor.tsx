import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { toE164 } from '@mucho-loco/customer-core/phone';
import { Field } from '@/components/Field';
import { Body, Button } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { userRepository } from '@/lib/repositories';
import { colors, space } from '@/theme';

/**
 * Completar o cambiar el teléfono (spec 015) — de él dependen los avisos de
 * WhatsApp, y quien entró con Google/Facebook nunca lo dio. Se valida con
 * `toE164` antes de mandar nada, igual que el registro y que la web.
 */
export function PhoneEditor({ email, onSaved, onCancel }: { email: string; onSaved: () => void; onCancel?: () => void }) {
  const { t } = useT();
  const copy = t.dashboard.phone;
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const phone = toE164(value);
    if (!phone) {
      setError(copy.invalid);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await userRepository.updatePhone(email, phone);
      onSaved();
    } catch {
      setError(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.editor}>
      <Field
        label={copy.label}
        value={value}
        onChangeText={setValue}
        placeholder={copy.placeholder}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      {error && <Body style={styles.error}>{error}</Body>}
      <Button title={saving ? copy.saving : copy.save} onPress={save} loading={saving} />
      {onCancel && <Button title={copy.cancel} variant="outline" onPress={onCancel} />}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: space.sm },
  error: { color: colors.redBright },
});
