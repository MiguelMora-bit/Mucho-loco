import type { SubmitEvent } from 'react';
import { SocialButtons } from './SocialButtons';

interface SignupFormProps {
  loading: boolean;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  onSocialLogin: () => void;
}

export function SignupForm({ loading, onSubmit, onSocialLogin }: SignupFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <div className="field">
        <label>Nombre completo</label>
        <input name="name" type="text" placeholder="Diego Ramírez" required />
      </div>
      <div className="field">
        <label>Email</label>
        <input name="email" type="email" placeholder="bestia@email.com" required />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Contraseña</label>
          <input name="password" type="password" placeholder="••••••••" required />
        </div>
        <div className="field">
          <label>Cumpleaños</label>
          <input name="birthday" type="date" required />
        </div>
      </div>
      <button className="submit-btn" type="submit" disabled={loading}>
        {loading ? 'CREANDO CUENTA...' : 'SOLTAR LA BESTIA'}
      </button>
      <div className="or-divider">O REGÍSTRATE CON</div>
      <SocialButtons onClick={onSocialLogin} />
      <p className="terms">Al registrarte aceptas nuestros <a href="#">Términos</a> y la <a href="#">Política de Privacidad</a>. Tu primer día es gratis, bestia.</p>
    </form>
  );
}
