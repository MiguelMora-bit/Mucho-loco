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
  plan: string;
  branch: string;
  tierKey: TierKey;
  expiresAt: string;
  visits: number;
  streak: number;
  daysLeft: number;
  accessCode: string;
  status: AccessStatus;
  /** Deadline to fix a failed payment before access is suspended. Only set (non-null) while status is 'grace'. */
  graceEndsAt: string | null;
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
  durationMinutes: number;
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

/** 'pending_payment' only applies to cash + pickup (the online checkout lets
 *  you choose "efectivo" only when delivery is pickup — see CLAUDE.md raíz,
 *  "Pagos en línea"): the order isn't paid yet, cash is collected in person
 *  when the member picks it up at the branch. Every other payment method
 *  starts at 'ready' since it was already charged online. */
export type OrderStatus = 'pending_payment' | 'ready' | 'done';

/** Online checkout methods (customer-app). Distinct from the in-person
 *  `PaymentMethod` below (counter sales) — see that type's comment. */
export type OnlinePaymentMethod = 'card' | 'transfer' | 'mercadopago' | 'stripe' | 'paypal' | 'cash';

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
      birthdayLabel: string;
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
    brandLabel: string;
    nav: {
      home: string;
      access: string;
      orders: string;
      profile: string;
      settings: string;
      performance: string;
      community: string;
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
      statVisitsDelta: string;
      statStreak: string;
      statStreakDelta: string;
      statDaysLeft: string;
      statDaysLeftDelta: string;
      statBranches: string;
      statBranchesDelta: string;
      thisWeek: string;
    };
    access: {
      expiresLabel: string;
      branchLabel: string;
      allGyms: string;
      showQr: string;
      suspendedNote: string;
      accessHistory: string;
      entryNote: string;
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
    };
    workouts: {
      historyPrefix: string;
      historyHighlight: string;
      setsUnit: string;
      volUnit: string;
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

export interface CounterSale {
  id: string;
  branchId: number;
  items: CounterSaleItem[];
  total: number;
  paymentMethod: PaymentMethod;
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

export interface Workout {
  date: string;
  name: LocalizedString;
  sets: number;
  vol: string;
  pr: LocalizedString | null;
  duration: string;
}

export interface PerformanceStat {
  lbl: LocalizedString;
  num: string;
  sub: LocalizedString;
  color: string;
}

export interface PersonalRecord {
  exercise: LocalizedString;
  weight: string;
  date: string;
  delta: string;
}

export type HeatmapLevel = '' | 'l1' | 'l2' | 'l3';
