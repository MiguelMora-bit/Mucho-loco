export type Lang = 'es' | 'en';

export type PlanKey = 'visit' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

export type TierKey = 'single' | 'all';

export type BranchTier = 'Lite' | 'Core' | 'Premium';

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
}

export interface Visit {
  day: string;
  month: string;
  branch: string;
  duration: string;
}

export type OrderStatus = 'ready' | 'done';

/** Online checkout methods (customer-app). Distinct from the in-person
 *  `PaymentMethod` below (counter sales) — see that type's comment. */
export type OnlinePaymentMethod = 'card' | 'transfer' | 'mercadopago' | 'stripe' | 'paypal' | 'cash';

export interface OrderItem {
  name: string;
  flav: string;
  img: string;
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
      logout: string;
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
      accessHistory: string;
      entryNote: string;
    };
    orders: {
      ready: string;
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

export type AccessStatus = 'active' | 'grace' | 'expired';

export interface MemberAccessRecord {
  qrCode: string;
  memberName: string;
  status: AccessStatus;
  expiresAt: string;
  /** Alcance de la membresía (ver "Membresía y alcance de acceso" en CLAUDE.md raíz): 'single' solo da acceso en homeBranchId, 'all' en cualquier sucursal. */
  tierKey: TierKey;
  homeBranchId: number;
  homeBranchName: string;
}

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
