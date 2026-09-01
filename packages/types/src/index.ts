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
  name: string;
  flav: string;
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
  expiresAt: string;
  visits: number;
  streak: number;
  daysLeft: number;
}

export interface Visit {
  day: string;
  month: string;
  branch: string;
  duration: string;
}

export type OrderStatus = 'ready' | 'done';

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
  avisos: {
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
  };
  common: {
    updating: string;
  };
}
