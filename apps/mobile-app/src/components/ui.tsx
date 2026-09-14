import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, space } from '@/theme';

/**
 * Piezas base de la UI. Hacen el papel de las clases de `globals.css` en la
 * web (`font-display`, `text-ml-cream-dim`, `.next-btn`…): en React Native no
 * hay CSS global ni herencia de estilos entre padres e hijos, así que el
 * "estilo de la casa" se encapsula en componentes.
 */

export function Display({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.display, style]} />;
}

export function Heading({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.heading, style]} />;
}

export function Body({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.body, style]} />;
}

export function Mono({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.mono, style]} />;
}

export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}

interface ScreenProps {
  children: ReactNode;
  /** `false` cuando la pantalla trae su propia lista con scroll. */
  scroll?: boolean;
  /** Las pestañas no tienen header: el contenido tiene que librar el notch. Las pantallas del Stack sí lo tienen. */
  safeTop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll = true, safeTop = true, contentStyle }: ScreenProps) {
  return (
    <SafeAreaView edges={safeTop ? ['top'] : []} style={styles.screen}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'outline' ? styles.buttonOutline : styles.buttonPrimary,
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.cream} /> : <Text style={styles.buttonText}>{title}</Text>}
    </Pressable>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.red} size="large" />
    </View>
  );
}

export function ErrorState({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Body style={styles.errorText}>{message}</Body>
      <Button title={retryLabel} variant="outline" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xl * 3 },
  fill: { flex: 1 },
  display: { fontFamily: fonts.display, color: colors.cream, fontSize: 40, lineHeight: 44 },
  heading: { fontFamily: fonts.bebas, color: colors.cream, fontSize: 24, letterSpacing: 1 },
  body: { fontFamily: fonts.body, color: colors.creamDim, fontSize: 15, lineHeight: 22 },
  mono: { fontFamily: fonts.mono, color: colors.creamDim, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: space.sm },
  button: { minHeight: 52, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: colors.red },
  buttonOutline: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  buttonText: { fontFamily: fonts.bebas, color: colors.cream, fontSize: 20, letterSpacing: 1.2 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  chip: { paddingVertical: space.sm, paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.red, borderColor: colors.red },
  chipText: { fontFamily: fonts.bebas, color: colors.creamDim, fontSize: 16, letterSpacing: 1 },
  chipTextActive: { color: colors.cream },
  center: { paddingVertical: space.xl, alignItems: 'center', justifyContent: 'center', gap: space.md },
  errorText: { textAlign: 'center' },
});
