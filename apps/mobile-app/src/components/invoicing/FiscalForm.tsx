import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { FiscalProfile } from '@mucho-loco/types';
import {
  CFDI_USES,
  TAX_SYSTEMS,
  allowedCfdiUses,
  validateFiscalProfile,
  type FiscalProfileErrors,
} from '@mucho-loco/customer-core/fiscal';
import { Field } from '@/components/Field';
import { Body, Button, Card, Chip, Mono } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { invoicingRepository } from '@/lib/repositories';
import { colors, space } from '@/theme';

const EMPTY: FiscalProfile = { taxId: '', legalName: '', taxSystem: '', zip: '', cfdiUse: '' as FiscalProfile['cfdiUse'], email: null };

interface FiscalFormProps {
  email: string;
  initial: FiscalProfile | null;
  onSaved: (profile: FiscalProfile) => void;
  onCancel?: () => void;
}

/**
 * Datos fiscales — mismas reglas que el formulario de la web (validación de
 * forma y filtro régimen ↔ uso, de customer-core), con controles nativos: no
 * hay `<select>`, así que régimen y uso son chips.
 */
export function FiscalForm({ email, initial, onSaved, onCancel }: FiscalFormProps) {
  const { t, lang } = useT();
  const copy = t.invoicing.fiscal;
  const [value, setValue] = useState<FiscalProfile>(initial ?? EMPTY);
  const [errors, setErrors] = useState<FiscalProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState(false);

  const uses = allowedCfdiUses(value.taxSystem);

  function set<K extends keyof FiscalProfile>(key: K, next: FiscalProfile[K]) {
    setValue((current) => {
      const updated = { ...current, [key]: next };
      // Un uso que el régimen nuevo no admite se limpia: el SAT lo rechazaría.
      if (key === 'taxSystem' && !allowedCfdiUses(String(next)).includes(updated.cfdiUse)) {
        updated.cfdiUse = '' as FiscalProfile['cfdiUse'];
      }
      return updated;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function save() {
    setFailure(false);
    const found = validateFiscalProfile(value);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setSaving(true);
    try {
      onSaved(await invoicingRepository.saveFiscalProfile(email, value));
    } catch {
      setFailure(true);
    } finally {
      setSaving(false);
    }
  }

  const error = (key: keyof FiscalProfileErrors) =>
    errors[key] ? <Body style={styles.error}>{copy.errors[key]}</Body> : null;

  return (
    <Card style={styles.card}>
      <Field label={copy.taxId} value={value.taxId} onChangeText={(v) => set('taxId', v)} autoCapitalize="characters" autoCorrect={false} />
      {error('taxId') ?? <Body>{copy.taxIdHelp}</Body>}

      <Field label={copy.legalName} value={value.legalName} onChangeText={(v) => set('legalName', v)} autoCapitalize="characters" />
      {error('legalName') ?? <Body>{copy.legalNameHelp}</Body>}

      <Mono>{copy.taxSystem}</Mono>
      <View style={styles.column}>
        {TAX_SYSTEMS.map((s) => (
          <Chip key={s.key} label={`${s.key} — ${s.name[lang]}`} active={value.taxSystem === s.key} onPress={() => set('taxSystem', s.key)} />
        ))}
      </View>
      {error('taxSystem')}

      <Field label={copy.zip} value={value.zip} onChangeText={(v) => set('zip', v)} keyboardType="number-pad" maxLength={5} />
      {error('zip') ?? <Body>{copy.zipHelp}</Body>}

      <Mono>{copy.cfdiUse}</Mono>
      {value.taxSystem ? (
        <>
          <View style={styles.row}>
            {CFDI_USES.filter((u) => uses.includes(u.key)).map((u) => (
              <Chip key={u.key} label={`${u.key} — ${u.name[lang]}`} active={value.cfdiUse === u.key} onPress={() => set('cfdiUse', u.key)} />
            ))}
          </View>
          <Body>{copy.cfdiUseFiltered}</Body>
        </>
      ) : (
        <Body>{copy.cfdiUsePlaceholder}</Body>
      )}
      {error('cfdiUse')}

      <Field
        label={copy.email}
        value={value.email ?? ''}
        onChangeText={(v) => set('email', v)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error('email') ?? <Body>{copy.emailHelp.replace('{email}', email)}</Body>}

      {failure && <Body style={styles.error}>{t.invoicing.errors.connection}</Body>}
      <Button title={saving ? copy.saving : copy.save} onPress={save} loading={saving} />
      {onCancel && <Button title={copy.cancel} variant="outline" onPress={onCancel} disabled={saving} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  column: { gap: space.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  error: { color: colors.redBright },
});
