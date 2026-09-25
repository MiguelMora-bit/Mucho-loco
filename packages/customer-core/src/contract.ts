/**
 * Contrato de datos del lado del socio.
 *
 * Es lo que piden los dos clientes del socio (`apps/customer-app` en web y
 * `apps/mobile-app` en iOS/Android) y lo que tienen que cumplir por igual los
 * mocks de `./mock` y los datasources HTTP de cada app contra `apps/backend`.
 * Cada implementación hace `implements IXRepository`: si una se desvía del
 * contrato, no compila — en ninguno de los dos apps.
 *
 * Qué datasource se usa (mock o HTTP) lo decide cada app, no este paquete:
 * la política cambia por plataforma (cookie httpOnly en Next, SecureStore en
 * el móvil) y el contrato no.
 */
import type {
  Announcement,
  Branch,
  Cfdi,
  CommunityPost,
  FeedPost,
  FiscalProfile,
  HeatmapLevel,
  Lang,
  MembershipInfo,
  MembershipPlanChoice,
  MembershipTier,
  MemberCharge,
  NewOrderLine,
  OfflinePaymentMethod,
  Order,
  OrderDelivery,
  PerformanceStat,
  PersonalRecord,
  Product,
  SocialLink,
  UserProfile,
  Visit,
  Workout,
} from '@mucho-loco/types';

export interface IAnnouncementRepository {
  getAll(): Promise<Announcement[]>;
}

export interface IBranchRepository {
  getAll(): Promise<Branch[]>;
  getById(id: number): Promise<Branch | null>;
  getFeatured(): Promise<Branch[]>;
}

export interface ICommunityRepository {
  getFeed(email: string): Promise<CommunityPost[]>;
  /**
   * El autor (nombre y sucursal) NO es un parámetro: lo resuelve quien
   * implementa este contrato a partir de la identidad del socio — el mock
   * desde su propio registro, el datasource HTTP desde el ID token que
   * verifica el backend. Antes venía del caller, y eso dejaba firmar un post
   * con el nombre de otra persona (ver CommunityController).
   */
  createPost(email: string, body: string): Promise<CommunityPost>;
  toggleLike(email: string, postId: string): Promise<CommunityPost>;
  addComment(email: string, postId: string, body: string): Promise<CommunityPost>;
}

/** Un PDF o XML de una factura, listo para mandarlo al navegador. */
export interface InvoiceFile {
  data: Uint8Array;
  contentType: string;
  filename: string;
}

/**
 * Facturación del socio (CFDI). Mismo criterio que `IUserRepository`: `email`
 * está en la firma porque el mock lo necesita para saber de quién son los
 * datos; el datasource HTTP lo ignora y manda el ID token de la sesión.
 *
 * Los rechazos (ya facturado, fuera de plazo, el SAT rechazó los datos…) se
 * leen con `invoicingErrorOf` de `./invoicing-errors`, igual en mock y HTTP.
 */
export interface IInvoicingRepository {
  /** `null` = todavía no captura sus datos fiscales (no es un error). */
  getFiscalProfile(email: string): Promise<FiscalProfile | null>;

  /** Crea o reemplaza, y devuelve lo guardado ya normalizado (mayúsculas, correo vacío = `null`). */
  saveFiscalProfile(email: string, profile: FiscalProfile): Promise<FiscalProfile>;

  /** Sus cobros más recientes (hasta 100), del más nuevo al más viejo, con su estado de facturación. */
  getCharges(email: string): Promise<MemberCharge[]>;

  /** Emite el CFDI del cobro con los datos fiscales guardados; el PAC manda PDF y XML por correo. */
  invoiceCharge(email: string, chargeId: string): Promise<Cfdi>;

  /** Solo facturas individuales del socio — la global no es suya. */
  downloadInvoice(email: string, cfdiId: string, format: 'pdf' | 'xml'): Promise<InvoiceFile>;
}

export interface IMembershipRepository {
  getTiers(): Promise<MembershipTier[]>;
}

/** Una página de la pasarela a la que hay que mandar al socio. */
export interface RedirectSession {
  url: string;
}

export interface CheckoutSession extends RedirectSession {
  orderId: string;
}

export interface IPaymentRepository {
  /**
   * Abre un cobro con pasarela. Igual que `createOrder`, NO recibe importes:
   * el servidor arma el total desde el catálogo y es él quien se lo cobra a
   * la tarjeta.
   */
  createCheckoutSession(
    email: string,
    lines: NewOrderLine[],
    delivery: OrderDelivery,
    lang: Lang,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CheckoutSession>;

  /**
   * Contratar o renovar la membresía. Visita = pago único; el resto =
   * suscripción que se cobra sola. Tampoco recibe importe: el precio sale de
   * la sucursal, el tier y el periodo, del lado del servidor. La membresía se
   * activa cuando el backend recibe el webhook, NO al volver a `successUrl`.
   *
   * Rechaza con 'ALREADY_SUBSCRIBED' (ya tiene una suscripción viva) o
   * 'MEMBERSHIP_STILL_ACTIVE' (visita sobre una membresía vigente) — leerlo
   * con `membershipErrorCode` de `./membership-errors`, igual en mock y HTTP.
   */
  createMembershipCheckout(
    email: string,
    plan: MembershipPlanChoice,
    lang: Lang,
    successUrl: string,
    cancelUrl: string,
  ): Promise<RedirectSession>;

  /**
   * Periodo de gracia: la página de Stripe con la factura que no se pudo
   * cobrar, para pagarla con otra tarjeta. Stripe no regresa de esa página;
   * `returnUrl` solo lo usa el mock, que "paga" al instante y regresa ahí.
   * Falla con 'NOTHING_TO_PAY' si no hay factura pendiente.
   */
  openMembershipInvoice(email: string, returnUrl: string): Promise<RedirectSession>;

  /**
   * Portal de cliente de Stripe (spec 005): cancelar o reactivar la
   * renovación, cambiar la tarjeta. Solo con `membership.hasSubscription`;
   * si no, 'NO_BILLING_ACCOUNT'. Lo que el socio haga ahí llega por webhook:
   * al volver, se relee la membresía. En el mock, cada visita alterna la
   * renovación cancelada/activa, para poder ver los dos estados sin Stripe.
   */
  openBillingPortal(email: string, returnUrl: string, lang: Lang): Promise<RedirectSession>;
}

export interface IPerformanceRepository {
  getStats(): Promise<PerformanceStat[]>;
  getPersonalRecords(): Promise<PersonalRecord[]>;
  getWorkouts(): Promise<Workout[]>;
  /** La asistencia real del socio, 52 semanas × 7 días (spec 016). */
  getHeatmap(email: string): Promise<HeatmapLevel[][]>;
}

export interface IProductRepository {
  getAll(): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  getByCategory(cat: string): Promise<Product[]>;
  getSiblings(id: string, cat: string): Promise<Product[]>;
}

export interface ISocialRepository {
  getLinks(): Promise<SocialLink[]>;
  getFeed(): Promise<FeedPost[]>;
}

export interface IUserRepository {
  getProfile(email: string): Promise<UserProfile>;
  /**
   * Completa o cambia el teléfono (E.164, ya normalizado con `toE164`) y
   * devuelve el perfil (spec 015). Sin teléfono no hay avisos de WhatsApp.
   */
  updatePhone(email: string, phone: string): Promise<UserProfile>;
  /**
   * `null` = nunca ha contratado. Un socio nuevo nace sin membresía: existe
   * desde su primer cobro confirmado (en línea o en mostrador).
   */
  getMembership(email: string): Promise<MembershipInfo | null>;
  getVisitHistory(email: string): Promise<Visit[]>;
  getOrders(email: string): Promise<Order[]>;
  /**
   * `lines` es solo `{ productId, qty }` y NO se manda un total: precio,
   * nombre, sabor, imagen y suma los resuelve el servidor desde el catálogo
   * (ver "Seguridad" en apps/backend/CLAUDE.md). `lang` dice en qué idioma
   * congelar el recibo — un pedido no se retraduce después.
   *
   * Solo efectivo al recoger: el pedido nace pendiente de pago y lo cobra
   * mostrador. Todo pago en línea (y todo envío a domicilio) va por
   * `IPaymentRepository.createCheckoutSession` — Stripe. Antes esta ruta
   * aceptaba tarjeta/transferencia/Mercado Pago/PayPal y creaba el pedido como
   * pagado sin cobrar nada.
   *
   * `email` sigue en la firma porque el mock lo necesita para saber de quién
   * es el pedido; los datasources HTTP lo ignoran y mandan el ID token de la
   * sesión, que es la única identidad en la que el backend confía.
   */
  createOrder(
    email: string,
    lines: NewOrderLine[],
    paymentMethod: OfflinePaymentMethod,
    delivery: OrderDelivery,
    lang: Lang,
  ): Promise<Order>;
}
