import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Mono } from '@/components/ui';
import { colors, fonts, space } from '@/theme';

/**
 * Campo de texto con etiqueta. La etiqueta es también su nombre accesible:
 * así lo encuentran los lectores de pantalla y los tests (`getByLabel`).
 * Lo comparten el registro y la dirección de envío del checkout.
 */
export function Field({ label, ...input }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Mono>{label}</Mono>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={styles.input} {...input} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.cream,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingHorizontal: space.md,
    paddingVertical: 14,
  },
});
