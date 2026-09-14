import { useRouter } from 'expo-router';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { Screen } from '@/components/ui';

/** Modal de login que abre el checkout: al entrar, se cierra y el checkout sigue donde estaba. */
export default function LoginScreen() {
  const router = useRouter();
  return (
    <Screen safeTop={false}>
      <AuthPanel onSuccess={() => router.back()} />
    </Screen>
  );
}
