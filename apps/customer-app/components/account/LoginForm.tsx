import type { SubmitEvent } from 'react';
import { SocialButtons } from './SocialButtons';

interface LoginFormProps {
  loading: boolean;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  onSocialLogin: () => void;
  onSwitchToSignup: () => void;
}

export function LoginForm({ loading, onSubmit, onSocialLogin, onSwitchToSignup }: LoginFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <div className="field">
        <label>Email o usuario</label>
        <input name="email" type="text" placeholder="bestia@email.com" autoComplete="username" />
      </div>
      <div className="field">
        <label>Contraseña</label>
        <input name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
      </div>
      <div className="small-row">
        <label><input type="checkbox" /> Mantener sesión</label>
        <a href="#">¿Olvidaste tu contraseña?</a>
      </div>
      <button className="submit-btn" type="submit" disabled={loading}>
        {loading ? 'ENTRANDO...' : 'PRENDER LA MECHA'}
      </button>
      <div className="or-divider">O ENTRA CON</div>
      <SocialButtons onClick={onSocialLogin} />
      <p className="terms">¿Es tu primera vez? <button type="button" className="bg-transparent border-none text-ml-cream-dim underline cursor-pointer text-xs" onClick={onSwitchToSignup}>Crea tu cuenta</button> y entrena el primer día gratis.</p>
    </form>
  );
}
