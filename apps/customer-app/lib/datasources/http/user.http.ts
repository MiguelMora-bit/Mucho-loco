import type {
  UserProfile,
  MembershipInfo,
  Visit,
  Order,
  NewOrderLine,
  OnlinePaymentMethod,
  Lang,
} from '@mucho-loco/types';
import type { IUserRepository } from '../../repositories/user.repository';
import { apiGet, apiPost } from './client';
import { cookieSessionToken, requireToken, type TokenProvider } from './session-token';

/**
 * `/users/me/*` del backend NestJS.
 *
 * El parámetro `email` del contrato se IGNORA a propósito en los seis
 * métodos: el backend saca la identidad del ID token verificado y nunca de un
 * dato que el cliente pueda elegir (ver "Seguridad — 3 decisiones que NO son
 * fieles al mock" en apps/backend/CLAUDE.md). Se mantiene en la firma porque
 * es lo que el mock necesita, y borrarlo obligaría a tocar cada caller — que
 * es justo lo que el diseño contract-first quiere evitar.
 *
 * Solo se llama desde el servidor (Server Components de `(account)/` y Route
 * Handlers de `app/api/`), que es donde la cookie httpOnly `ml_session` se
 * puede leer.
 */
export class UserHttpDatasource implements IUserRepository {
  constructor(private readonly getToken: TokenProvider = cookieSessionToken) {}

  private async token(path: string): Promise<string> {
    return requireToken(this.getToken, path);
  }

  async getProfile(_email: string): Promise<UserProfile> {
    return apiGet<UserProfile>('/users/me', { token: await this.token('/users/me') });
  }

  async getMembership(_email: string): Promise<MembershipInfo> {
    return apiGet<MembershipInfo>('/users/me/membership', {
      token: await this.token('/users/me/membership'),
    });
  }

  async retryMembershipPayment(_email: string): Promise<MembershipInfo> {
    const path = '/users/me/membership/retry-payment';
    return apiPost<MembershipInfo>(path, {}, { token: await this.token(path) });
  }

  async getVisitHistory(_email: string): Promise<Visit[]> {
    return apiGet<Visit[]>('/users/me/visits', { token: await this.token('/users/me/visits') });
  }

  async getOrders(_email: string): Promise<Order[]> {
    return apiGet<Order[]>('/users/me/orders', { token: await this.token('/users/me/orders') });
  }

  async createOrder(
    _email: string,
    lines: NewOrderLine[],
    paymentMethod: OnlinePaymentMethod,
    delivery: 'pickup' | 'home',
    lang: Lang,
  ): Promise<Order> {
    const path = '/users/me/orders';
    return apiPost<Order>(
      path,
      { items: lines, paymentMethod, delivery, lang },
      { token: await this.token(path) },
    );
  }
}
