import type { ApiClient } from '@mucho-loco/api-client';
import type {
  CommunityPost,
  HeatmapLevel,
  Lang,
  MembershipInfo,
  MembershipPlanChoice,
  NewOrderLine,
  OfflinePaymentMethod,
  Order,
  OrderDelivery,
  PerformanceStat,
  ShippingAddress,
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
  RedirectSession,
} from '../contract';

// Dominios de cuenta, detrás de `CognitoAuthGuard`. Todos van con
// `auth: true` y sin `maxAgeSeconds`: los datos de un socio nunca se cachean.
//
// El parámetro `email` del contrato se IGNORA a propósito en todos los
// métodos: el backend saca la identidad del ID token verificado y nunca de un
// dato que el cliente pueda elegir (ver "Seguridad" en apps/backend/CLAUDE.md).
// Sigue en la firma porque el mock lo necesita.

const ACCOUNT = { auth: true } as const;

/**
 * En el cable `delivery` sigue siendo 'pickup' | 'home' y la dirección viaja
 * aparte (ver CreateOrderDto del backend); en el contrato es una unión para
 * que "a domicilio sin dirección" no compile.
 */
function deliveryBody(
  delivery: OrderDelivery,
): { delivery: 'pickup' } | { delivery: 'home'; address: ShippingAddress } {
  return delivery.method === 'home' ? { delivery: 'home', address: delivery.address } : { delivery: 'pickup' };
}

/** `/users/me/*`. */
export class UserHttpDatasource implements IUserRepository {
  private readonly api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  getProfile(_email: string): Promise<UserProfile> {
    return this.api.get<UserProfile>('/users/me', ACCOUNT);
  }

  updatePhone(_email: string, phone: string): Promise<UserProfile> {
    return this.api.put<UserProfile>('/users/me/phone', { phone }, ACCOUNT);
  }

  /** 404 = todavía no contrata (un socio nuevo nace sin membresía). */
  getMembership(_email: string): Promise<MembershipInfo | null> {
    return this.api.getOrNull<MembershipInfo>('/users/me/membership', ACCOUNT);
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
    paymentMethod: OfflinePaymentMethod,
    delivery: OrderDelivery,
    lang: Lang,
  ): Promise<Order> {
    return this.api.post<Order>(
      '/users/me/orders',
      { items: lines, paymentMethod, ...deliveryBody(delivery), lang },
      ACCOUNT,
    );
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
    delivery: OrderDelivery,
    lang: Lang,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CheckoutSession> {
    return this.api.post<CheckoutSession>(
      '/payments/checkout-sessions',
      { items: lines, ...deliveryBody(delivery), lang, successUrl, cancelUrl },
      ACCOUNT,
    );
  }

  /** `POST /payments/membership-checkout-sessions` — solo lo elegido; el precio lo pone el servidor. */
  createMembershipCheckout(
    _email: string,
    plan: MembershipPlanChoice,
    lang: Lang,
    successUrl: string,
    cancelUrl: string,
  ): Promise<RedirectSession> {
    return this.api.post<RedirectSession>(
      '/payments/membership-checkout-sessions',
      { branchId: plan.branchId, tierKey: plan.tierKey, periodKey: plan.periodKey, lang, successUrl, cancelUrl },
      ACCOUNT,
    );
  }

  /** `POST /payments/membership-invoice`. Stripe no regresa de esa página: `returnUrl` no viaja. */
  openMembershipInvoice(_email: string, _returnUrl: string): Promise<RedirectSession> {
    return this.api.post<RedirectSession>('/payments/membership-invoice', {}, ACCOUNT);
  }

  /** `POST /payments/billing-portal-sessions`. */
  openBillingPortal(_email: string, returnUrl: string, lang: Lang): Promise<RedirectSession> {
    return this.api.post<RedirectSession>('/payments/billing-portal-sessions', { returnUrl, lang }, ACCOUNT);
  }
}
