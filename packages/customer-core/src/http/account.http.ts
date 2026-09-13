import type { ApiClient } from '@mucho-loco/api-client';
import type {
  CommunityPost,
  HeatmapLevel,
  Lang,
  MembershipInfo,
  NewOrderLine,
  OnlinePaymentMethod,
  Order,
  PerformanceStat,
  PersonalRecord,
  UserProfile,
  Visit,
  Workout,
} from '@mucho-loco/types';
import type {
  CheckoutSession,
  ICommunityRepository,
  IPaymentRepository,
  IPerformanceRepository,
  IUserRepository,
} from '../contract';

// Dominios de cuenta, detrás de `CognitoAuthGuard`. Todos van con
// `auth: true` y sin `maxAgeSeconds`: los datos de un socio nunca se cachean.
//
// El parámetro `email` del contrato se IGNORA a propósito en todos los
// métodos: el backend saca la identidad del ID token verificado y nunca de un
// dato que el cliente pueda elegir (ver "Seguridad" en apps/backend/CLAUDE.md).
// Sigue en la firma porque el mock lo necesita.

const ACCOUNT = { auth: true } as const;

/** `/users/me/*`. */
export class UserHttpDatasource implements IUserRepository {
  private readonly api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  getProfile(_email: string): Promise<UserProfile> {
    return this.api.get<UserProfile>('/users/me', ACCOUNT);
  }

  getMembership(_email: string): Promise<MembershipInfo> {
    return this.api.get<MembershipInfo>('/users/me/membership', ACCOUNT);
  }

  retryMembershipPayment(_email: string): Promise<MembershipInfo> {
    return this.api.post<MembershipInfo>('/users/me/membership/retry-payment', {}, ACCOUNT);
  }

  getVisitHistory(_email: string): Promise<Visit[]> {
    return this.api.get<Visit[]>('/users/me/visits', ACCOUNT);
  }

  getOrders(_email: string): Promise<Order[]> {
    return this.api.get<Order[]>('/users/me/orders', ACCOUNT);
  }

  /** Solo `{ productId, qty }` + `lang`: el total lo calcula el servidor. */
  createOrder(
    _email: string,
    lines: NewOrderLine[],
    paymentMethod: OnlinePaymentMethod,
    delivery: 'pickup' | 'home',
    lang: Lang,
  ): Promise<Order> {
    return this.api.post<Order>('/users/me/orders', { items: lines, paymentMethod, delivery, lang }, ACCOUNT);
  }
}

/**
 * Feed interno entre socios (`/community/posts`). El autor (nombre y
 * sucursal) lo resuelve el backend desde el ID token — el body solo lleva el
 * texto.
 */
export class CommunityHttpDatasource implements ICommunityRepository {
  private readonly api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  getFeed(_email: string): Promise<CommunityPost[]> {
    return this.api.get<CommunityPost[]>('/community/posts', ACCOUNT);
  }

  createPost(_email: string, body: string): Promise<CommunityPost> {
    return this.api.post<CommunityPost>('/community/posts', { body }, ACCOUNT);
  }

  toggleLike(_email: string, postId: string): Promise<CommunityPost> {
    return this.api.post<CommunityPost>(`/community/posts/${postId}/like`, {}, ACCOUNT);
  }

  addComment(_email: string, postId: string, body: string): Promise<CommunityPost> {
    return this.api.post<CommunityPost>(`/community/posts/${postId}/comments`, { body }, ACCOUNT);
  }
}

/**
 * `/performance/*` — detrás del guard aunque todavía no filtre por socio (el
 * backend sirve el mismo seed a todos; ver apps/backend/CLAUDE.md). Manda el
 * token igual, para no tener que tocar esto el día que sí personalice.
 */
export class PerformanceHttpDatasource implements IPerformanceRepository {
  private readonly api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  getStats(): Promise<PerformanceStat[]> {
    return this.api.get<PerformanceStat[]>('/performance/stats', ACCOUNT);
  }

  getPersonalRecords(): Promise<PersonalRecord[]> {
    return this.api.get<PersonalRecord[]>('/performance/records', ACCOUNT);
  }

  getWorkouts(): Promise<Workout[]> {
    return this.api.get<Workout[]>('/performance/workouts', ACCOUNT);
  }

  getHeatmap(): Promise<HeatmapLevel[][]> {
    return this.api.get<HeatmapLevel[][]>('/performance/heatmap', ACCOUNT);
  }
}

/** `POST /payments/checkout-sessions` — crea el pedido pendiente y la sesión de Stripe. */
export class PaymentHttpDatasource implements IPaymentRepository {
  private readonly api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  createCheckoutSession(
    _email: string,
    lines: NewOrderLine[],
    delivery: 'pickup' | 'home',
    lang: Lang,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CheckoutSession> {
    return this.api.post<CheckoutSession>(
      '/payments/checkout-sessions',
      { items: lines, delivery, lang, successUrl, cancelUrl },
      ACCOUNT,
    );
  }
}
