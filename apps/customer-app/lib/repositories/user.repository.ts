import type {
  UserProfile,
  MembershipInfo,
  Visit,
  Order,
  NewOrderLine,
  OnlinePaymentMethod,
  Lang,
} from '@mucho-loco/types';
import { UserMockDatasource } from '../datasources/mock/user.mock';
import { UserHttpDatasource } from '../datasources/http/user.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export interface IUserRepository {
  getProfile(email: string): Promise<UserProfile>;
  getMembership(email: string): Promise<MembershipInfo>;
  retryMembershipPayment(email: string): Promise<MembershipInfo>;
  getVisitHistory(email: string): Promise<Visit[]>;
  getOrders(email: string): Promise<Order[]>;
  /**
   * `lines` es solo `{ productId, qty }` y NO se manda un total: precio,
   * nombre, sabor, imagen y suma los resuelve el servidor desde el catálogo
   * (ver "Seguridad" en apps/backend/CLAUDE.md). `lang` dice en qué idioma
   * congelar el recibo — un pedido no se retraduce después.
   *
   * `email` sigue en la firma porque el mock lo necesita para saber de quién
   * es el pedido; el datasource HTTP lo ignora y usa el ID token de la cookie
   * `ml_session`, que es la única identidad en la que el backend confía.
   */
  createOrder(
    email: string,
    lines: NewOrderLine[],
    paymentMethod: OnlinePaymentMethod,
    delivery: 'pickup' | 'home',
    lang: Lang,
  ): Promise<Order>;
}

export const userRepository: IUserRepository = isHttpDatasourceEnabled()
  ? new UserHttpDatasource()
  : new UserMockDatasource();
