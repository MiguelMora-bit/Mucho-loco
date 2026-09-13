import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { authService } from '@/lib/auth';
import { authErrorCode, authErrorMessage } from '@/lib/auth/errors';
import type { SocialProvider } from '@/lib/auth/types';
import { useT } from '@/lib/i18n';
import { useSessionStore } from '@/lib/stores/session.store';
import { colors, fonts, space } from '@/theme';
import { Body, Button, Chip, Display, Mono } from '../ui';

type Mode = { name: 'login' } | { name: 'signup' } | { name: 'confirm'; email: string; password: string };

/**
 * Entrar, registrarse y confirmar el código — el `AccountClient` de la web.
 * Lo usan la pestaña Cuenta (sin sesión), el modal `/login` del checkout y
 * Comunidad sin sesión.
 *
 * Tras confirmar el código se entra solo, con el email y la contraseña que el
 * socio acaba de escribir (igual que `/api/auth/confirm` en la web).
 */
export function AuthPanel({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useT();
  const [mode, setMode] = useState<Mode>({ name: 'login' });
  const toConfirm = (email: string, password: string) => setMode({ name: 'confirm', email, password });

  return (
    <View style={styles.wrap}>
      <View>
        <Display>{t.account.headlineA}</Display>
        <Display style={styles.red}>{t.account.headlineB}</Display>
      </View>
      <Body>{t.account.tagline}</Body>

      {mode.name !== 'confirm' && (
        <View style={styles.tabs}>
          <Chip label={t.account.loginTab} active={mode.name === 'login'} onPress={() => setMode({ name: 'login' })} />
          <Chip label={t.account.signupTab} active={mode.name === 'signup'} onPress={() => setMode({ name: 'signup' })} />
        </View>
      )}

      {mode.name === 'login' && <LoginForm onSuccess={onSuccess} onNeedsConfirm={toConfirm} />}
      {mode.name === 'signup' && <SignupForm onCreated={toConfirm} />}
      {mode.name === 'confirm' && (
        <ConfirmForm
          email={mode.email}
          password={mode.password}
          onSuccess={onSuccess}
          onBack={() => setMode({ name: 'login' })}
        />
      )}
    </View>
  );
}

function Field({ label, ...input }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Mono>{label}</Mono>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...input}
      />
    </View>
  );
}

/** Estado común de un formulario: enviando + mensaje de error ya traducido. */
function useSubmit() {
  const { t, m } = useT();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>, onError?: (err: unknown) => boolean) {
    setSubmitting(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      // onError devuelve true si ya manejó el error (no hay que mostrarlo).
      if (!onError?.(err)) setError(authErrorMessage(authErrorCode(err), t, m));
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, error, run };
}

function LoginForm({
  onSuccess,
  onNeedsConfirm,
}: {
  onSuccess?: () => void;
  onNeedsConfirm: (email: string, password: string) => void;
}) {
  const { t, m } = useT();
  const signIn = useSessionStore((s) => s.signIn);
  const signInWithProvider = useSessionStore((s) => s.signInWithProvider);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { submitting, error, run } = useSubmit();

  const submit = () =>
    run(
      async () => {
        await signIn(email, password);
        onSuccess?.();
      },
      (err) => {
        // Cuenta sin confirmar: se le reenvía el código y se le lleva a
        // escribirlo, en vez de solo decirle que no puede entrar.
        if (authErrorCode(err) !== 'NOT_CONFIRMED') return false;
        authService.resendCode(email).catch(() => {});
        onNeedsConfirm(email, password);
        return true;
      },
    );

  const social = (provider: SocialProvider) =>
    run(async () => {
      if (await signInWithProvider(provider)) onSuccess?.();
    });

  return (
    <View style={styles.form}>
      <Field
        label={t.account.login.emailLabel}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="diego@mucholoco.mx"
      />
      <Field
        label={t.account.login.passwordLabel}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        onSubmitEditing={submit}
      />

      {error && <Body style={styles.error}>{error}</Body>}

      <Button
        title={submitting ? t.account.login.submitting : t.account.login.submit}
        onPress={submit}
        loading={submitting}
        disabled={!email || !password}
      />

      {authService.socialProviders.length > 0 && (
        <>
          <Mono style={styles.center}>{t.account.login.orDivider}</Mono>
          <View style={styles.tabs}>
            {authService.socialProviders.map((p) => (
              <Button key={p} title={p.toUpperCase()} variant="outline" onPress={() => social(p)} style={styles.flex} />
            ))}
          </View>
        </>
      )}

      {authService.kind === 'mock' && <Mono style={styles.note}>{m.account.demoNote}</Mono>}
    </View>
  );
}

function SignupForm({ onCreated }: { onCreated: (email: string, password: string) => void }) {
  const { t, m } = useT();
  const s = t.account.signup;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { submitting, error, run } = useSubmit();

  const submit = () =>
    run(async () => {
      await authService.signUp({ name, email, password, phone });
      onCreated(email.trim(), password);
    });

  return (
    <View style={styles.form}>
      <Field label={s.nameLabel} value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
      <Field
        label={s.emailLabel}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        label={m.auth.phoneLabel}
        value={phone}
        onChangeText={setPhone}
        autoComplete="tel"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        placeholder="55 1234 5678"
      />
      <Mono style={styles.note}>{m.auth.phoneNote}</Mono>
      <Field
        label={s.passwordLabel}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />

      {error && <Body style={styles.error}>{error}</Body>}

      <Button
        title={submitting ? s.submitting : s.submit}
        onPress={submit}
        loading={submitting}
        disabled={!name || !email || !phone || !password}
      />
      <Mono style={styles.note}>
        {s.termsPrefix} {s.termsLink} {s.termsAnd} {s.privacyLink}. {s.termsSuffix}
      </Mono>
    </View>
  );
}

function ConfirmForm({
  email,
  password,
  onSuccess,
  onBack,
}: {
  email: string;
  password: string;
  onSuccess?: () => void;
  onBack: () => void;
}) {
  const { t, m } = useT();
  const c = t.account.confirm;
  const signIn = useSessionStore((s) => s.signIn);
  const [code, setCode] = useState('');
  const [resent, setResent] = useState(false);
  const { submitting, error, run } = useSubmit();

  const submit = () =>
    run(async () => {
      await authService.confirmSignUp(email, code);
      await signIn(email, password);
      onSuccess?.();
    });

  const resend = () =>
    run(async () => {
      await authService.resendCode(email);
      setResent(true);
    });

  return (
    <View style={styles.form}>
      <Body>
        {c.sentPrefix} <Body style={styles.cream}>{email}</Body>
      </Body>
      <Field
        label={c.codeLabel}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        onSubmitEditing={submit}
      />

      {error && <Body style={styles.error}>{error}</Body>}
      {resent && <Body style={styles.notice}>{c.resent}</Body>}

      <Button
        title={submitting ? c.submitting : c.submit}
        onPress={submit}
        loading={submitting}
        disabled={code.trim().length < 6}
      />
      <Button title={c.resend} variant="outline" onPress={resend} disabled={submitting} />
      <Button title={m.auth.backToLogin} variant="outline" onPress={onBack} />

      {authService.kind === 'mock' && <Mono style={styles.note}>{m.auth.demoCode}</Mono>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  form: { gap: space.md },
  red: { color: colors.red },
  cream: { color: colors.cream },
  tabs: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
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
  error: { color: colors.redBright },
  notice: { color: colors.green },
  note: { textTransform: 'none', lineHeight: 16, color: colors.muted },
});
