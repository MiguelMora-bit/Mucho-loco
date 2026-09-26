export type Lang = 'es' | 'en';

export type PlanKey = 'visit' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

export type TierKey = 'single' | 'all';

export type BranchTier = 'Lite' | 'Core' | 'Premium';

/** Shared between branch-app (QR check-in) and customer-app (member's own
 *  dashboard): a failed recurring charge moves a member from 'active' to
 *  'grace' (access still allowed, avisos shown) and, if unresolved, to
 *  'expired' (access suspended) — see "Pago recurrente de mensualidad" in
 *  the root CLAUDE.md. */
export type AccessStatus = 'active' | 'grace' | 'expired';

/** Promoción activa de una sucursal (mapa de sucursales, "precios/promos" en
 *  Fase 1) — porcentaje sobre `Branch.price`, no un plan/tier aparte. */
export interface BranchPromo {
  label: LocalizedString;
  detail: LocalizedString;
  discountPercent: number;
}

export interface Branch {
  id: number;
  name: string;
  city: string;
  addr: string;
  phone: string;
  lat: number;
  lng: number;
  classes: number;
  coaches: number;
  price: number;
  tier: BranchTier;
  featured?: boolean;
  promo?: BranchPromo;
  hours: string;
  img: string;
}

export interface Coach {
  name: string;
  spec: string;
  branch: string;
  img: string;
}

export type ProductCat = 'proteinas' | 'pre' | 'energy' | 'gomitas' | 'agua' | 'merch';

export interface Product {
  id: string;
  cat: ProductCat;
  name: LocalizedString;
  flav: LocalizedString;
  price: number;
  img: string;
  tag?: string;
}

export interface CartItem extends Product {
  qty: number;
}

export type LocalizedString = Record<Lang, string>;

export interface Announcement {
  id: string;
  type: string;
  badge: LocalizedString;
  date: string;
  dateLabel: LocalizedString;
  title: LocalizedString;
  subtitle: LocalizedString;
  body: LocalizedString;
  cta: LocalizedString;
  link?: string;
  location: LocalizedString;
  emoji: string;
  accent: string;
}

export interface MembershipTier {
  key: TierKey;
  name: LocalizedString;
  factor: number;
  /** Precio fijo, igual en cualquier sucursal. Si está presente, gana sobre `factor × branch.price`. */
  basePrice?: number;
  perks: Record<Lang, string[]>;
  badge: LocalizedString;
  popular?: boolean;
}

export interface AuthUser {
  email: string;
  name: string;
}

export interface UserProfile {
  email: string;
  name: string;
  phone: string;
  birthdate: string;
  branch: string;
}

export interface MembershipInfo {
  branch: string;
  tierKey: TierKey;
  /** El nombre del plan lo arma quien lo pinta (`membershipPlanLabel` de
   *  customer-core), en su idioma — el contrato manda las claves (spec 011). */
  periodKey: PlanKey;
  expiresAt: string;
  /** Días con entrada este mes (spec 012: una visita por día, hora de CDMX). */
  visits: number;
  streak: number;
  /** Para "+N vs mes anterior" (spec 013). */
  visitsLastMonth: number;
  /** La racha más larga del último año; nunca menor que `streak`. */
  bestStreak: number;
  /** Sucursales distintas con entrada este mes. */
  branchesThisMonth: number;
  daysLeft: number;
  accessCode: string;
  status: AccessStatus;
  /** Deadline to fix a failed payment before access is suspended. Only set (non-null) while status is 'grace'. */
  graceEndsAt: string | null;
  /**
   * true = la renueva una suscripción: se cobra sola al vencer, así que no
   * hay que avisarle "renueva". false = vence y hay que volver a contratar
   * (se pagó en mostrador, fue una visita, o canceló la suscripción).
   */
  autoRenews: boolean;
  /**
   * Tiene una suscripción de Stripe viva, aunque haya cancelado la renovación
   * (spec 005). Decide "Administrar suscripción" y que no se pueda contratar
   * otra encima (el backend respondería ALREADY_SUBSCRIBED).
   */
  hasSubscription: boolean;
}

/**
 * Lo único que el socio elige al contratar una membresía en línea. Igual que
 * `NewOrderLine`, NO lleva precio: el importe lo calcula el servidor desde la
 * sucursal, el tier y el periodo — el cliente nunca decide cuánto se cobra.
 */
export interface MembershipPlanChoice {
  branchId: number;
  tierKey: TierKey;
  periodKey: PlanKey;
}

/**
 * Una visita al gimnasio.
 *
 * `visitedAt` en ISO y `durationMinutes` como número, NO texto ya formateado
 * (antes eran `day: '18'`, `month: 'JUN'`, `duration: '1h 24m'`). El formato
 * es decisión de quien pinta, y con texto pre-armado la pantalla no podía
 * cambiar de idioma — el mismo defecto que ya se corrigió en `Order.date` y
 * en `MembershipInfo.expiresAt`.
 */
export interface Visit {
  visitedAt: string;
  branch: string;
  /** `null` = no se registró la salida (hoy sucursal solo registra la entrada, spec 012). */
  durationMinutes: number | null;
}

export interface CommunityComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

/** Feed interno entre socios ("Comunidad" en el CLAUDE.md raíz) — distinto
 *  del feed de marketing del landing (`FeedPost` más abajo, redes sociales
 *  externas del gym). Sin rankings ni conexión con el módulo Rendimiento
 *  por ahora. */
export interface CommunityPost {
  id: string;
  authorName: string;
  authorBranch: string;
  body: string;
  createdAt: string;
  likeCount: number;
  /** Relativo a quien pide el feed — por eso getFeed(email) recibe el email del viewer. */
  likedByMe: boolean;
  comments: CommunityComment[];
}

/**
 * - `pending_payment`: todavía sin cobrar — efectivo al recoger (se cobra en
 *   mostrador), o una sesión de Stripe que no se ha pagado.
 * - `ready`: cobrado. Al recoger: listo en la sucursal. A domicilio: bodega
 *   lo tiene que mandar. Solo el webhook de Stripe (o mostrador, en efectivo)
 *   deja un pedido cobrado — nunca el cliente.
 * - `shipped`: solo a domicilio — va en camino con la paquetería.
 * - `done`: entregado.
 */
export type OrderStatus = 'pending_payment' | 'ready' | 'shipped' | 'done';

/** Online checkout methods (customer-app). Distinct from the in-person
 *  `PaymentMethod` below (counter sales) — see that type's comment. */
export type OnlinePaymentMethod = 'card' | 'transfer' | 'mercadopago' | 'stripe' | 'paypal' | 'cash';

/**
 * Lo único que se puede pedir sin pasar por la pasarela: efectivo al recoger.
 * Todo lo demás se cobra en Stripe (tarjeta, OXXO, SPEI). Antes
 * "transferencia", Mercado Pago y PayPal creaban el pedido como pagado sin
 * cobrar nada. `OnlinePaymentMethod` sigue existiendo para pintar pedidos
 * viejos.
 */
export type OfflinePaymentMethod = 'cash';

export interface OrderItem {
  name: string;
  flav: string;
  img: string;
  qty: number;
}
/**
 * Lo único que el cliente manda al crear un pedido: qué producto y cuántos.
 *
 * Nombre, sabor, imagen, precio unitario y total los resuelve el servidor
 * desde el catálogo — un cliente no puede elegir cuánto paga (ver "Seguridad"
 * en apps/backend/CLAUDE.md). `OrderItem` de arriba es la respuesta ya
 * congelada, no la entrada.
 */
export interface NewOrderLine {
  productId: string;
  qty: number;
}

/**
 * Dirección de entrega a domicilio (México). Se congela en el pedido: si el
 * socio se muda, un pedido viejo no cambia de destino. `phone` va en E.164
 * (`+525512345678`): es a quien llama el repartidor.
 */
export interface ShippingAddress {
  /** Calle, número exterior e interior. */
  street: string;
  /** Colonia. */
  neighborhood: string;
  /** Alcaldía o municipio. */
  city: string;
  state: string;
  /** 5 dígitos. */
  postalCode: string;
  phone: string;
  /** Entre calles, fachada… */
  references?: string;
}

/**
 * Cómo se entrega un pedido nuevo. Una unión y no dos campos sueltos: así "a
 * domicilio sin dirección" no compila — antes el checkout pedía la dirección
 * y nunca la mandaba, y los pedidos a domicilio se creaban sin destino.
 */
export type OrderDelivery = { method: 'pickup' } | { method: 'home'; address: ShippingAddress };

export interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  paymentMethod: OnlinePaymentMethod;
  delivery: 'pickup' | 'home';
  /** Pickup branch — set only when delivery is 'pickup' (home orders ship from the central warehouse, no branch involved). */
  branch?: string;
  /** A dónde se envía — solo cuando delivery es 'home'. */
  shippingAddress?: ShippingAddress;
  /** Guía de la paquetería, si bodega la capturó al enviarlo. */
  trackingNumber?: string;
  /** ISO datetime — set once status becomes 'done'. */
  deliveredAt?: string;
}

export interface Translations {
  nav: {
    gym: string;
    branches: string;
    coaches: string;
    memberships: string;
    shop: string;
    contact: string;
    account: string;
  };
  hero: {
    live: string;
    titleA: string;
    titleB: string;
    titleC: string;
    lead: string;
    ctaJoin: string;
    ctaTour: string;
  };
  stats: Array<{ n: string; l: string }>;
  branches: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    sub: string;
    quote: string;
    classes: string;
    coaches: string;
    price: string;
    viewMore: string;
    hours: string;
    legendBranch: string;
    legendSelected: string;
    loadingMap: string;
    viewPrices: string;
    mapKeyMissing: string;
    promoBadge: string;
    promoWasPrefix: string;
  };
  coaches: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    sub: string;
    quote: string;
    spec: string;
    branch: string;
  };
  /** Pantalla para contratar o renovar la membresía (web: /membership; móvil: pantalla `membership`). */
  membershipCheckout: {
    eyebrow: string;
    title: string;
    sub: string;
    branchLabel: string;
    branchNoteSingle: string;
    branchNoteAll: string;
    tierLabel: string;
    periodLabel: string;
    totalLabel: string;
    periodSuffix: Record<PlanKey, string>;
    recurringNote: string;
    oneTimeNote: string;
    carryOverPrefix: string;
    carryOverSuffix: string;
    pay: string;
    paying: string;
    error: string;
    alreadySubscribed: string;
    stillActive: string;
    cancelled: string;
  };
  /** Nombre del plan de un socio: "15 SUCURSALES · MENSUAL" (spec 011). */
  membershipPlan: {
    tiers: Record<TierKey, string>;
    periods: Record<PlanKey, string>;
  };
  memberships: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    sub: string;
    visit: string;
    weekly: string;
    monthly: string;
    quarterly: string;
    annual: string;
    popular: string;
    choose: string;
    select: string;
    perks: string[];
    partners: string;
    partnersSub: string;
    branchPriceNote: string;
    allGymsLocation: string;
    allGymsFixedPrice: string;
    partnersEyebrow: string;
    partnersNote: string;
    totalPassNote: string;
    wellhubNote: string;
    partnerAccepted: string;
  };
  shop: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    sub: string;
    filterAll: string;
    add: string;
    added: string;
    quote: string;
  };
  cart: {
    title: string;
    empty: string;
    subtotal: string;
    checkout: string;
    remove: string;
    continue: string;
  };
  contact: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    sub: string;
    name: string;
    email: string;
    branch: string;
    message: string;
    send: string;
    followUs: string;
    freeVisitBadge: string;
    freeVisitTitle: string;
    freeVisitBody: string;
    freeVisitCta: string;
    freeVisitNote: string;
    freeVisitStep1: string;
    freeVisitStep2: string;
    freeVisitStep3: string;
    latestPosts: string;
    feedRefreshLabel: string;
    feedLive: string;
    postDaily: string;
    followers: string;
    whatsappMessage: string;
    whatsappCta: string;
  };
  announcements: {
    board: string;
    title: string;
    sub: string;
    empty: string;
    close: string;
    newTag: string;
    seeAll: string;
  };
  footer: {
    tagline: string;
    navigate: string;
    terms: string;
    privacy: string;
    rules: string;
    corporate: string;
    madeWith: string;
  };
  product: {
    store: string;
    back: string;
    addedToBag: string;
    addToBag: string;
    branchPickup: string;
    homeDelivery: string;
    securePayment: string;
    moreFrom: string;
    theCategory: string;
    notFound: string;
    backToShop: string;
  };
  common: {
    updating: string;
    connectionError: string;
  };
  error: {
    title: string;
    retry: string;
  };
  account: {
    headlineA: string;
    headlineB: string;
    tagline: string;
    taglineBold: string;
    backToSite: string;
    loginTab: string;
    signupTab: string;
    errorLogin: string;
    errors: {
      userExists: string;
      invalidPassword: string;
      notConfirmed: string;
      wrongCredentials: string;
      codeMismatch: string;
      codeExpired: string;
      tooManyAttempts: string;
      socialLoginFailed: string;
      invalidPhone: string;
    };
    confirm: {
      sentPrefix: string;
      codeLabel: string;
      submit: string;
      submitting: string;
      resend: string;
      resent: string;
    };
    login: {
      emailLabel: string;
      passwordLabel: string;
      remember: string;
      forgot: string;
      submit: string;
      submitting: string;
      orDivider: string;
      firstTime: string;
      createAccount: string;
      freeDayNote: string;
    };
    signup: {
      nameLabel: string;
      emailLabel: string;
      passwordLabel: string;
      phoneLabel: string;
      phoneNote: string;
      submit: string;
      submitting: string;
      orDivider: string;
      termsPrefix: string;
      termsLink: string;
      termsAnd: string;
      privacyLink: string;
      termsSuffix: string;
    };
  };
  dashboard: {
    /** Completar o cambiar el teléfono (spec 015). */
    phone: {
      missingTitle: string;
      missingBody: string;
      label: string;
      placeholder: string;
      save: string;
      saving: string;
      change: string;
      cancel: string;
      invalid: string;
      saveError: string;
    };
    brandLabel: string;
    nav: {
      home: string;
      access: string;
      orders: string;
      profile: string;
      settings: string;
      performance: string;
      community: string;
      invoicing: string;
      logout: string;
    };
    membershipStatus: {
      active: string;
      grace: string;
      expired: string;
    };
    home: {
      weekdays: string[];
      welcomePrefix: string;
      branchLabel: string;
      planLabel: string;
      membershipExpiringPrefix: string;
      membershipExpiringSuffix: string;
      renewNotePrefix: string;
      renewNoteSuffix: string;
      renew: string;
      paymentFailedTitle: string;
      paymentFailedBody: string;
      graceUntilPrefix: string;
      retryPayment: string;
      retryPaymentError: string;
      suspendedTitle: string;
      suspendedBody: string;
      reactivate: string;
      statVisits: string;
      /** "vs mes anterior": el número lo pone quien pinta (spec 013). */
      statVisitsDeltaSuffix: string;
      statStreak: string;
      statBestStreakLabel: string;
      statDaysLeft: string;
      statBranches: string;
      statBranchesDelta: string;
      thisWeek: string;
      noMembershipTitle: string;
      noMembershipBody: string;
      choosePlan: string;
      paymentProcessingTitle: string;
      paymentProcessingBody: string;
      autoRenewsPrefix: string;
      /** Spec 005: portal de Stripe y renovación cancelada. */
      manageSubscription: string;
      renewalCanceledPrefix: string;
      reactivateRenewal: string;
      portalError: string;
    };
    access: {
      expiresLabel: string;
      branchLabel: string;
      allGyms: string;
      showQr: string;
      suspendedNote: string;
      accessHistory: string;
      entryNote: string;
      noMembershipNote: string;
    };
    orders: {
      ready: string;
      pendingPayment: string;
      delivered: string;
      showQrLabel: string;
      pickupNote: string;
      deliveredBranchPrefix: string;
      deliveredAtPrefix: string;
      paymentMethodLabel: string;
      close: string;
      /** Estado 'ready' de un pedido a domicilio: pagado, falta mandarlo. */
      preparingShipment: string;
      shipToLabel: string;
      shipped: string;
      trackingLabel: string;
    };
    profile: {
      personalData: string;
      nameLabel: string;
      emailLabel: string;
      phoneLabel: string;
      birthdateLabel: string;
      myMembership: string;
      planLabel: string;
      branchLabel: string;
      expiresLabel: string;
      statusLabel: string;
      partnersLabel: string;
      notLinked: string;
      renewMembership: string;
      noMembership: string;
    };
    settings: {
      title: string;
      languageLabel: string;
      notificationsLabel: string;
      notificationsSub: string;
      notifMembership: string;
      notifOrderReady: string;
      notifPayment: string;
    };
    qr: {
      title: string;
      sub: string;
      close: string;
    };
    community: {
      title: string;
      composerPlaceholder: string;
      post: string;
      posting: string;
      postError: string;
      empty: string;
      commentPlaceholder: string;
      sendComment: string;
    };
  };
  checkout: {
    steps: string[];
    backToShop: string;
    errorPlacingOrder: string;
    cart: {
      title: string;
      empty: string;
      goToShop: string;
      itemCountSingular: string;
      itemCountPlural: string;
      reviewNote: string;
      summary: string;
      subtotal: string;
      deliveryLabel: string;
      pickupOption: string;
      pickupSub: string;
      homeOption: string;
      homeSub: string;
      shippingLabel: string;
      total: string;
      continueToPayment: string;
    };
    payment: {
      title: string;
      shippingAddress: string;
      streetLabel: string;
      cityLabel: string;
      zipLabel: string;
      neighborhoodLabel: string;
      stateLabel: string;
      phoneLabel: string;
      referencesLabel: string;
      addressInvalid: string;
      paymentMethod: string;
      payCard: string;
      payTransfer: string;
      payMercadopago: string;
      payStripe: string;
      payPaypal: string;
      payCash: string;
      cardNumberLabel: string;
      cardExpiryLabel: string;
      cardCvcLabel: string;
      cardNameLabel: string;
      transferNote: string;
      redirectNote: string;
      cashNote: string;
      processing: string;
      confirmOrder: string;
      yourOrder: string;
      subtotal: string;
      shippingLabel: string;
      total: string;
    };
    confirmation: {
      titleA: string;
      titleB: string;
      emailNote: string;
      pickupNote: string;
      homeNote: string;
      viewAccount: string;
      keepShopping: string;
    };
  };
  performance: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    tabs: {
      overview: string;
      workouts: string;
      heatmap: string;
    };
    overview: {
      recordsPrefix: string;
      recordsHighlight: string;
      recordsSuffix: string;
      /** Tarjetas calculadas (spec 018). */
      workoutsLabel: string;
      volumeLabel: string;
      streakLabel: string;
      prsLabel: string;
      vsLastMonth: string;
      bestStreak: string;
      noPrs: string;
      noRecords: string;
    };
    workouts: {
      historyPrefix: string;
      historyHighlight: string;
      setsUnit: string;
      volUnit: string;
      /** Registrar entrenamientos (spec 017). */
      empty: string;
      log: string;
      logTitle: string;
      nameLabel: string;
      namePlaceholder: string;
      dayLabel: string;
      today: string;
      yesterday: string;
      durationLabel: string;
      exerciseLabel: string;
      exercisePlaceholder: string;
      repsLabel: string;
      weightLabel: string;
      addSet: string;
      addExercise: string;
      removeSet: string;
      removeExercise: string;
      save: string;
      saving: string;
      invalid: string;
      saveError: string;
      delete: string;
      confirmDelete: string;
      deleteError: string;
      kgUnit: string;
    };
    heatmap: {
      titlePrefix: string;
      titleHighlight: string;
      caption: string;
      less: string;
      more: string;
      trained: string;
      noRecord: string;
    };
  };
  /** Facturar (CFDI) — `/invoicing`. `{email}`, `{description}`, `{date}`, `{uuid}` se llenan al pintar. */
  invoicing: {
    title: string;
    subtitle: string;
    fiscal: {
      title: string;
      emptyTitle: string;
      emptyBody: string;
      edit: string;
      save: string;
      saving: string;
      saved: string;
      cancel: string;
      taxId: string;
      taxIdHelp: string;
      legalName: string;
      legalNameHelp: string;
      taxSystem: string;
      taxSystemPlaceholder: string;
      zip: string;
      zipHelp: string;
      cfdiUse: string;
      cfdiUsePlaceholder: string;
      cfdiUseFiltered: string;
      email: string;
      emailHelp: string;
      errors: Record<'taxId' | 'legalName' | 'taxSystem' | 'zip' | 'cfdiUse' | 'email', string>;
    };
    charges: {
      title: string;
      empty: string;
      invoice: string;
      downloadPdf: string;
      downloadXml: string;
      wrongData: string;
      whatsappMessage: string;
    };
    status: Record<ChargeInvoiceStatus, { label: string; hint: string }>;
    confirm: {
      title: string;
      chargeLabel: string;
      fiscalLabel: string;
      warning: string;
      confirm: string;
      confirming: string;
      cancel: string;
      success: string;
    };
    errors: {
      FISCAL_PROFILE_REQUIRED: string;
      CHARGE_NOT_FOUND: string;
      CHARGE_ALREADY_INVOICED: string;
      INVOICING_WINDOW_CLOSED: string;
      CHARGE_NOT_INVOICEABLE: string;
      INVOICING_UNAVAILABLE: string;
      FISCAL_DATA_REJECTED: string;
      INVOICING_PROVIDER_ERROR: string;
      CFDI_NOT_FOUND: string;
      connection: string;
      fixData: string;
    };
  };
}

// --- branch-app (Phase 1) ---

export type PickupOrderStatus = 'ready' | 'delivered';

/** Staff-facing view of a "recoger en gym" order. Deliberately NOT `extends
 *  Order` — Order.status ('ready'|'done') is the customer's own mental
 *  model; staff need branchId/customerName which don't belong there. */
export interface PickupOrder {
  id: string;
  branchId: number;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: PickupOrderStatus;
  placedAt: string;
}

// --- owner-panel: envíos a domicilio (bodega central) ---

/** Un envío visto por bodega: por mandar, en camino o entregado. */
export type ShipmentStatus = 'to_ship' | 'shipped' | 'delivered';

/**
 * Un pedido a domicilio visto por bodega. Mismo criterio que `PickupOrder`:
 * no extiende `Order`, porque bodega necesita el nombre del socio y la
 * dirección completa. Solo aparecen pedidos ya cobrados.
 */
export interface ShipmentOrder {
  id: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: ShipmentStatus;
  /** null solo en pedidos de antes de que el checkout mandara la dirección. */
  address: ShippingAddress | null;
  trackingNumber?: string;
  placedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface CounterSaleItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
}

/** Cash and transfer only apply in person, never online (see business
 *  rules) — that's why this type doesn't exist on the customer-facing
 *  Order. 'card' here means a physical terminal swipe, not an online charge. */
export type PaymentMethod = 'cash' | 'card' | 'transfer';

/** Tipo de tarjeta de un cobro de mostrador: el SAT distingue crédito (04) de débito (28). Spec 009. */
export type CardType = 'credit' | 'debit';

export interface CounterSale {
  id: string;
  branchId: number;
  items: CounterSaleItem[];
  total: number;
  paymentMethod: PaymentMethod;
  /** Solo con `card`; ausente = no se capturó. */
  cardType?: CardType;
  createdAt: string;
}

/** unitPrice lives here (not just on CounterSaleItem) because the counter-
 *  sale screen needs to show staff what things cost before they're in a
 *  sale — same reasoning that added `paymentMethod` above. */
export interface BranchInventoryLevel {
  branchId: number;
  productId: string;
  productName: string;
  unitPrice: number;
  qty: number;
  img: string;
}

export interface MemberAccessRecord {
  qrCode: string;
  memberName: string;
  status: AccessStatus;
  expiresAt: string;
  /** Alcance de la membresía (ver "Membresía y alcance de acceso" en CLAUDE.md raíz): 'single' solo da acceso en homeBranchId, 'all' en cualquier sucursal. */
  tierKey: TierKey;
  homeBranchId: number;
  homeBranchName: string;
  /** Set solo cuando el socio se dio de alta con huella dactilar en vez de QR
   *  (ver CLAUDE.md raíz, "Métodos de acceso") — para socios sin la app. El
   *  registro siempre conserva un `qrCode` interno (identidad del registro,
   *  usado por mostrador para buscar/renovar), pero validar acceso en el
   *  gimnasio puede hacerse por CUALQUIERA de los dos: qrCode O fingerprintId. */
  fingerprintId?: string;
  /**
   * Su membresía se cobra sola en línea (suscripción de Stripe viva con la
   * renovación activa). Mostrador NO la renueva: le cobraría dos veces
   * (spec 006). Con la renovación cancelada en la app vuelve a `false`.
   */
  renewsOnline: boolean;
}

/** Cómo llegó mostrador al socio: escaneó su QR, leyó su huella, o lo buscó
 *  por nombre (último recurso, ver "Métodos de acceso" en el CLAUDE.md raíz). */
export type AccessMethodId = 'qr' | 'fingerprint' | 'name';

/** Resultado de evaluar el acceso de un socio en una sucursal. Vive aquí y no
 *  en branch-app porque el backend aplica la MISMA regla al resolver
 *  /member-access — la decisión de dejar pasar no puede depender de que el
 *  cliente la calcule bien. */
export type AccessCheckResult =
  | { outcome: 'not_found' }
  /** Único outcome que QR/huella nunca producen — solo la búsqueda por
   *  nombre puede matchear a más de un socio a la vez. */
  | { outcome: 'ambiguous'; candidates: MemberAccessRecord[] }
  | { outcome: 'wrong_branch'; record: MemberAccessRecord }
  | { outcome: 'expired'; record: MemberAccessRecord }
  | { outcome: 'valid'; record: MemberAccessRecord };

/**
 * La entrada que dejó un acceso permitido (spec 012). Una por socio por día de
 * CDMX: un segundo escaneo el mismo día deja pasar, pero devuelve la hora de la
 * primera con `firstToday: false` — mostrador ve "ya había entrado hoy".
 */
export interface CheckIn {
  visitedAt: string;
  firstToday: boolean;
  /** Sucursal de la primera entrada del día (spec 020): si no es esta, puede ser un QR prestado. */
  firstBranchId: number;
  firstBranch: string;
}

/**
 * El mismo QR entró el mismo día en otra sucursal (spec 020). No se bloquea
 * — un socio de 15 sucursales puede ir a dos — pero mostrador lo ve y HQ lo revisa.
 */
export interface AccessAlert {
  id: string;
  memberName: string;
  qrCode: string;
  /** Dónde y cuándo entró primero ese día. */
  firstBranch: string;
  firstAt: string;
  /** Dónde volvió a entrar. */
  branch: string;
  at: string;
}

/**
 * El atraso de la suscripción de un socio en gracia (spec 019): la factura
 * que Stripe no pudo cobrar, en pesos. Mostrador la cobra y Stripe la marca
 * pagada fuera de su plataforma; la suscripción sigue viva.
 */
export interface OverdueBalance {
  amount: number;
  tierKey: TierKey;
  periodKey: PlanKey;
}

/** Lo que responde validar en mostrador: la regla de acceso, y si dejó pasar, la entrada registrada. */
export type CheckInResult =
  | Exclude<AccessCheckResult, { outcome: 'valid' }>
  | { outcome: 'valid'; record: MemberAccessRecord; checkIn: CheckIn };

/** A membership sold or renewed in person at the counter — covers both
 *  signing up a new member (isNewMember: true, mints a new MemberAccessRecord)
 *  and renewing an existing member's plan (isNewMember: false, extends theirs). */
export interface MembershipPayment {
  id: string;
  branchId: number;
  qrCode: string;
  memberName: string;
  phone: string;
  tierKey: TierKey;
  periodKey: PlanKey;
  amount: number;
  paymentMethod: PaymentMethod;
  /** Solo con `card`; ausente = no se capturó. */
  cardType?: CardType;
  isNewMember: boolean;
  createdAt: string;
}

/** Corte de caja: siempre hay a lo mas uno 'open' por sucursal, cubriendo
 *  [openedAt, closedAt ?? ahora). 'closed' es un estado final — no se reabre,
 *  el siguiente shift se crea solo cuando se vuelve a pedir el abierto. */
export interface CashRegisterShift {
  id: string;
  branchId: number;
  openedAt: string;
  closedAt: string | null;
  status: 'open' | 'closed';
}

/** Vista fusionada de CounterSale + MembershipPayment para un shift — así
 *  el corte de caja muestra un solo timeline de "qué entró" sin que la UI
 *  tenga que combinar dos formas distintas de transacción. */
export interface ShiftTransaction {
  id: string;
  /** 'pickup' = pedido de la tienda pagado en efectivo AL RECOGER (ver "Pagos
   *  en línea" en el CLAUDE.md raíz) — ese dinero entra al cajón de la
   *  sucursal en el momento de la entrega, así que el corte tiene que verlo.
   *  Un pedido pagado en línea con tarjeta no entra: nunca tocó esa caja. */
  kind: 'sale' | 'membership' | 'pickup';
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

/** Un día dentro de la ventana de `BranchSalesReport.days` — sin entrada
 *  propia si no hubo ventas/pagos ese día (no se rellenan ceros). */
export interface DailySales {
  date: string;
  revenue: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  qtySold: number;
  revenue: number;
}

/** Reporte del gerente de UNA sucursal (ver "reportes/inventario local de
 *  gerente" en el CLAUDE.md de branch-app) — distinto del corte de caja
 *  (que es por turno, para cuadrar el cajón) y del panel del dueño (que ve
 *  las 15 sucursales a la vez, no una). */
export interface BranchSalesReport {
  branchId: number;
  days: number;
  totalRevenue: number;
  transactionCount: number;
  byDay: DailySales[];
  topProducts: TopProduct[];
}

/** Registro de asistencia de UN turno de UN empleado — a lo más uno "abierto"
 *  (clockOut: null) por staffEmail a la vez, mismo invariante que
 *  CashRegisterShift pero por persona en vez de por sucursal. Es la captura
 *  real que faltaba para que la nómina de owner-panel deje de depender de
 *  AttendanceSummary pre-cargado (ver su CLAUDE.md, "Pendiente Fase 3") —
 *  hoy vive aislada en el mock de branch-app, como todo lo demás hasta que
 *  exista backend real y ambos apps compartan la misma base de datos. */
export interface AttendanceEntry {
  id: string;
  branchId: number;
  staffEmail: string;
  staffName: string;
  clockIn: string;
  clockOut: string | null;
}

// --- owner-panel (Phase 1, read-only) ---

export interface BranchStatsSummary {
  branchId: number;
  branchName: string;
  revenue: number;
  activeCustomers: number;
  /** Entradas registradas hoy (día de CDMX), spec 014. */
  checkInsToday: number;
  /** Entradas en la misma ventana que `revenue`. */
  checkIns: number;
}

export interface GlobalInventoryItem {
  productId: string;
  productName: string;
  totalQty: number;
}

// --- owner-panel (Phase 2) ---

export type ExpenseCategory = 'rent' | 'utilities' | 'maintenance' | 'supplies' | 'marketing' | 'other';

/** branchId is null for corporate-wide expenses (national marketing, HQ
 *  payroll) that aren't tied to one location — everything else (rent,
 *  utilities) belongs to a specific branch, like BranchStatsSummary. */
export interface Expense {
  id: string;
  branchId: number | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
}

/** A completed movement of stock between two branches — branch inventory
 *  levels (BranchInventoryLevel) are updated immediately when one is
 *  created, same as CounterSale decrementing stock on sale. */
export interface InventoryTransfer {
  id: string;
  productId: string;
  productName: string;
  fromBranchId: number;
  fromBranchName: string;
  toBranchId: number;
  toBranchName: string;
  qty: number;
  createdAt: string;
}

// --- owner-panel (Phase 3) ---

export type EmployeeRole = 'manager' | 'counter' | 'coach';

/** Unlike Expense, an Employee always belongs to a real branch — there's no
 *  "corporate" employee in this feature yet. */
export interface Employee {
  id: string;
  branchId: number;
  name: string;
  /** Llave que cruza al empleado con la asistencia que captura branch-app
   *  (AttendanceEntry.staffEmail). Sin ella, nómina y asistencia siguen
   *  siendo dos islas — era el pendiente explícito de la Fase 3. */
  email: string;
  role: EmployeeRole;
  dailyRate: number;
  hireDate: string;
  active: boolean; // reserved for a future manage-employees screen; unread by today's calculation
}

/** A "quincena" — the standard Mexican biweekly pay cycle. status flips
 *  'open' → 'closed' the moment payroll is run for it; a closed period's
 *  Payslips are final and can't be re-run. */
export interface PayrollPeriod {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'open' | 'closed';
}

/** Pre-seeded/consumed by owner-panel, never written by it — real attendance
 *  capture is deferred to branch-app's future staff roles/login work and
 *  will populate this same shape without changing the calculation. */
export interface AttendanceSummary {
  employeeId: string;
  periodId: string;
  daysWorked: number;
}

/** grossPay/isrDeduction/imssDeduction/netPay are computed once, when a
 *  period is run, by owner-panel's lib/payroll.ts — ISR/IMSS there are a
 *  simplified, illustrative approximation, NOT the real SAT/IMSS tables.
 *  employeeName/role/branchId are denormalized for display, like
 *  CounterSaleItem.productName. */
export interface Payslip {
  id: string;
  periodId: string;
  employeeId: string;
  employeeName: string;
  branchId: number;
  role: EmployeeRole;
  daysWorked: number;
  totalDays: number;
  dailyRate: number;
  grossPay: number;
  isrDeduction: number;
  imssDeduction: number;
  netPay: number;
  generatedAt: string;
}

/** Reporte ejecutivo avanzado (Fase 3, "Pendiente" en el CLAUDE.md de
 *  owner-panel) — el dashboard básico de Fase 1 solo muestra ingresos y
 *  clientes activos; esto cruza esos ingresos con gastos (Expense) y costo
 *  de nómina (Payslip, ya generados vía runPayroll) para dar una P&L real
 *  por sucursal, algo que antes vivía repartido en 3 pantallas sin cruzarse.
 *  Puramente calculado — no hay datasource propio, ver lib/executiveReport.ts. */
export interface BranchPnl {
  branchId: number;
  branchName: string;
  revenue: number;
  expenses: number;
  payrollCost: number;
  netProfit: number;
}

export interface ExpenseByCategory {
  category: ExpenseCategory;
  total: number;
}

export interface ExecutiveReport {
  branches: BranchPnl[];
  totalRevenue: number;
  totalExpenses: number;
  totalPayrollCost: number;
  totalNetProfit: number;
  corporateExpenses: number;
  expensesByCategory: ExpenseByCategory[];
}

/** Movidos aquí desde apps/customer-app/lib/types/{social,performance}.ts
 *  (2026-09-12, migración de esos 2 dominios a apps/backend) — ambos apps
 *  necesitan el mismo contrato ahora. Los archivos locales de customer-app
 *  quedan como re-export para no tocar sus ~13 importadores existentes. */
export type SocialNetwork = 'instagram' | 'tiktok' | 'youtube' | 'facebook';

export interface SocialLink {
  key: SocialNetwork;
  name: string;
  handle: string;
  followers: string;
  url: string;
}

export interface FeedPost {
  net: SocialNetwork;
  img: string;
  cap: LocalizedString;
  likes: string;
  ago: string;
  url: string;
}

/** Una serie: repeticiones × kg (0 kg = peso corporal). Spec 017. */
export interface WorkoutSet {
  reps: number;
  weightKg: number;
}

export interface WorkoutExercise {
  /** Texto libre ("Press de banca"); para los récords se compara sin mayúsculas, acentos ni espacios de más. */
  name: string;
  sets: WorkoutSet[];
}

/** Lo que el socio registra (spec 017). Los derivados los calcula el servidor. */
export interface NewWorkout {
  /** Día del entrenamiento, fecha sin hora (`YYYY-MM-DD`). */
  date: string;
  /** Lo escribe el socio ("Push Day"): no se traduce. */
  name: string;
  durationMinutes: number | null;
  exercises: WorkoutExercise[];
}

/** Un ejercicio en el que el entrenamiento superó el mejor peso anterior. */
export interface WorkoutRecord {
  exercise: string;
  weightKg: number;
  /** El mejor peso anterior que superó (spec 018: "+10 kg"). */
  previousKg: number;
}

export interface Workout extends NewWorkout {
  id: string;
  setCount: number;
  /** Σ repeticiones × kg. El número; el formato lo pone quien lo pinta. */
  volumeKg: number;
  prs: WorkoutRecord[];
}

/**
 * Color de marca de una cifra de rendimiento — un nombre de la paleta, no CSS
 * (spec 010): cada cliente lo pinta con su tema (`var(--x)` en la web,
 * `colors.x` en el móvil).
 */
export type StatColor = 'red' | 'orange' | 'yellow' | 'gold' | 'green' | 'cream';

/**
 * La pestaña Resumen de Rendimiento (spec 018), en números: el texto ("+3 vs
 * mes anterior", "94K") y el color de cada tarjeta los pone quien pinta
 * (`performanceCards` de customer-core). Antes era `PerformanceStat`, con todo
 * eso armado y sembrado en el servidor.
 */
export interface PerformanceSummary {
  workoutsThisMonth: number;
  workoutsLastMonth: number;
  volumeThisMonthKg: number;
  volumeLastMonthKg: number;
  /** Racha de asistencia (spec 012): la misma que muestra el panel. */
  streak: number;
  bestStreak: number;
  prsThisMonth: number;
  /** Ejercicios con récord este mes, sin repetir. */
  prExercisesThisMonth: string[];
}

/** Un récord que marcó la regla del spec 017, con el peso que superó. */
export interface PersonalRecord {
  exercise: string;
  weightKg: number;
  /** Día del entrenamiento (fecha sin hora). */
  date: string;
  previousKg: number;
}

export type HeatmapLevel = '' | 'l1' | 'l2' | 'l3';

/* ── Facturación CFDI 4.0 (2026-09-15) ─────────────────────────────────────
 * Un solo RFC emite para las 15 sucursales (ver CLAUDE.md raíz). El PAC es
 * Facturapi; lo que aquí se llama CFDI es la factura timbrada ante el SAT, no
 * el "invoice" de Stripe Billing, que es un cobro. */

/** c_UsoCFDI que se ofrecen: G01 adquisición de mercancías, G03 gastos en general, S01 sin efectos fiscales. */
export type CfdiUse = 'G01' | 'G03' | 'S01';

/** Datos fiscales del socio, tal cual su Constancia de Situación Fiscal. */
export interface FiscalProfile {
  /** RFC, en mayúsculas. */
  taxId: string;
  /** Nombre o razón social, sin el régimen societario ("SA DE CV"). */
  legalName: string;
  /** c_RegimenFiscal del SAT: 601, 605, 612, 626… */
  taxSystem: string;
  /** Código postal del domicilio fiscal. */
  zip: string;
  cfdiUse: CfdiUse;
  /** A dónde llegan el PDF y el XML. null = el correo de la cuenta. */
  email: string | null;
}

/**
 * Si un cobro se puede facturar todavía:
 * - `available`: sí.
 * - `invoiced`: ya tiene su CFDI (desde la app o el portal de autofactura).
 * - `closed`: ya entró a la factura global del periodo; ya no se puede.
 * - `unavailable`: el recibo se canceló.
 */
export type ChargeInvoiceStatus = 'available' | 'invoiced' | 'closed' | 'unavailable';

/** Un cobro del socio, visto desde "Facturar". */
export interface MemberCharge {
  id: string;
  /** ISO. */
  paidAt: string;
  /** Pesos, IVA incluido — con centavos. */
  total: number;
  description: string;
  invoice: {
    status: ChargeInvoiceStatus;
    cfdiId: string | null;
    /** Folio fiscal del SAT. Solo con status 'invoiced' (la global no es del socio). */
    uuid: string | null;
  };
}

export type CfdiKind = 'individual' | 'global';

export interface Cfdi {
  id: string;
  /** Folio fiscal que asigna el SAT. */
  uuid: string;
  kind: CfdiKind;
  status: 'valid' | 'canceled';
  /** Estado de la solicitud de cancelación ante el SAT, tal cual lo reporta el PAC ('none' si no se ha pedido). */
  cancellationStatus: string;
  /** Pesos, con centavos. */
  total: number;
  customerTaxId: string;
  customerLegalName: string;
  /** ISO. */
  issuedAt: string;
}

/**
 * Motivos de cancelación del SAT que se aceptan hoy: 02 (errores sin
 * relación) y 03 (la operación no se llevó a cabo). 01 exige la factura que
 * la sustituye, y 04 es para operaciones de la factura global.
 */
export type CfdiCancellationMotive = '02' | '03';

/** Qué puede hacer un cliente de mostrador con la clave de su ticket. */
export type SelfInvoiceStatus = 'pending' | 'ready' | 'invoiced' | 'unavailable';

/** Cómo se cobró, tal como quedó en el registro de cobros. */
export type ChargeMethodKey = 'cash' | 'card' | 'card_credit' | 'card_debit' | 'oxxo' | 'spei' | 'transfer';

/**
 * El ticket de un cobro de mostrador (venta o membresía), armado del registro
 * de cobros, con su clave de autofactura (spec 003).
 */
export interface CounterTicket {
  kind: 'sale' | 'membership';
  /** Id de la venta o del pago de membresía — el mismo de `ShiftTransaction.id`. */
  sourceId: string;
  branchName: string;
  /** ISO — instante del cobro. */
  paidAt: string;
  lines: { description: string; qty: number; unitPrice: number }[];
  /** Pesos con centavos, IVA incluido. */
  total: number;
  method: ChargeMethodKey;
  selfInvoice: {
    status: SelfInvoiceStatus;
    key: string | null;
    /** Portal de autofactura de este cobro (Facturapi). */
    url: string | null;
    /** ISO; hasta cuándo deja autofacturar el portal. */
    expiresAt: string | null;
  };
}

/** Cuántos recibos hay en cada estado: `failed` es lo que HQ tiene que revisar. */
export interface InvoicingSummary {
  receipts: {
    pending: number;
    open: number;
    invoicedToCustomer: number;
    invoicedGlobally: number;
    canceled: number;
    failed: number;
  };
}
