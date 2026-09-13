import type { Lang } from '@mucho-loco/types';

/**
 * Textos que solo existen en el móvil: pestañas, "cómo llegar", avisos del
 * modo demo. Todo lo que la web ya tiene se reusa de
 * `@mucho-loco/customer-core/translations` — esto es SOLO lo que falta allá,
 * para no meterle claves del móvil a `Translations`.
 */
const es = {
  tabs: {
    home: 'Inicio',
    shop: 'Tienda',
    branches: 'Sucursales',
    account: 'Cuenta',
  },
  home: {
    announcements: 'AVISOS',
    goShop: 'IR A LA TIENDA',
  },
  branches: {
    directions: 'CÓMO LLEGAR',
    call: 'LLAMAR',
    perMonth: '/ mes',
  },
  cart: {
    view: 'VER CARRITO',
    loginToPay: 'INICIA SESIÓN PARA PAGAR',
    items: 'productos',
  },
  checkout: {
    paymentMethod: 'MÉTODO DE PAGO',
    delivery: 'ENTREGA',
    gatewayCancelled: 'Cancelaste el pago. Tu carrito sigue aquí.',
  },
  account: {
    language: 'IDIOMA',
    demoNote: 'Modo demo: cualquier email y una contraseña de 8+ caracteres. Con diego@mucholoco.mx ves datos de ejemplo.',
    visits: 'VISITAS',
    noOrders: 'Todavía no tienes pedidos.',
  },
  community: {
    like: 'Me gusta',
    comments: 'Comentarios',
  },
  orders: {
    detail: 'Ver pedido',
  },
  auth: {
    phoneLabel: 'Teléfono (WhatsApp)',
    invalidPhone: 'Revisa tu teléfono: 10 dígitos, o con +52 al inicio.',
    phoneNote: 'Por aquí te avisamos cuando tu membresía esté por vencer y cuando tu pedido esté listo.',
    demoCode: 'Modo demo: el código es 123456.',
    backToLogin: 'YA TENGO CUENTA',
  },
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type MobileMessages = Widen<typeof es>;

const en: MobileMessages = {
  tabs: {
    home: 'Home',
    shop: 'Shop',
    branches: 'Branches',
    account: 'Account',
  },
  home: {
    announcements: 'ANNOUNCEMENTS',
    goShop: 'GO TO SHOP',
  },
  branches: {
    directions: 'DIRECTIONS',
    call: 'CALL',
    perMonth: '/ month',
  },
  cart: {
    view: 'VIEW CART',
    loginToPay: 'LOG IN TO PAY',
    items: 'items',
  },
  checkout: {
    paymentMethod: 'PAYMENT METHOD',
    delivery: 'DELIVERY',
    gatewayCancelled: 'You cancelled the payment. Your cart is still here.',
  },
  account: {
    language: 'LANGUAGE',
    demoNote: 'Demo mode: any email and a password of 8+ characters. Use diego@mucholoco.mx to see sample data.',
    visits: 'VISITS',
    noOrders: "You don't have any orders yet.",
  },
  community: {
    like: 'Like',
    comments: 'Comments',
  },
  orders: {
    detail: 'View order',
  },
  auth: {
    phoneLabel: 'Phone (WhatsApp)',
    invalidPhone: 'Check your phone: 10 digits, or starting with +52.',
    phoneNote: "We'll message you here when your membership is about to expire and when your order is ready.",
    demoCode: 'Demo mode: the code is 123456.',
    backToLogin: 'I ALREADY HAVE AN ACCOUNT',
  },
};

export const mobileMessages: Record<Lang, MobileMessages> = { es, en };
