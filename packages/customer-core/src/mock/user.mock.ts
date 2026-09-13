import type { UserProfile, MembershipInfo, Visit, Order, OrderItem, NewOrderLine, OnlinePaymentMethod, Lang } from '@mucho-loco/types';
import type { IUserRepository } from '../contract';
import { PRODUCTS } from '../data';
import { HOME_SHIPPING_FEE } from '../pricing';
import { delay } from './delay';

interface UserRecord {
  profile: UserProfile;
  membership: MembershipInfo;
  history: Visit[];
  orders: Order[];
}

// Dos usuarios de prueba a propósito distintos: uno con tier 'all' (acceso a
// las 15 sucursales) y uno con tier 'single' (acceso a una sola). Mismos
// emails que los usuarios reales creados en Cognito (dev) — ver
// tests/e2e/global-setup.ts para el patrón de alta y CLAUDE.md de este app.
export const ALL_GYMS_TEST_EMAIL = 'diego@mucholoco.mx';
export const SINGLE_GYM_TEST_EMAIL = 'valeria@mucholoco.mx';

// MembershipInfo.expiresAt y .graceEndsAt viajan en ISO (fecha sola), no como
// texto ya formateado en español: es el mismo criterio que Order.date desde
// 2026-09-02 (ver CLAUDE.md de este app) y, sobre todo, es lo que devuelve el
// backend real — si el mock mandara "20 JUL 2026" y el backend un ISO, la
// pantalla se rompería solo al prender NEXT_PUBLIC_DATA_SOURCE=http. Quien
// pinta la fecha la formatea con lib/dates.ts.
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// Next.js compila los Route Handlers (app/api/*) y las páginas Server
// Component en "capas" de módulos separadas — cada una instanciaría su propia
// copia de este archivo si RECORDS fuera un simple `const` de módulo, y un
// pedido creado en /api/orders nunca aparecería en el dashboard. globalThis
// SÍ es compartido entre capas dentro del mismo proceso Node — mismo patrón
// que el singleton clásico de Prisma en dev de Next.js.
declare global {
  var __mlUserRecords: Record<string, UserRecord> | undefined;
}

function seedRecords(): Record<string, UserRecord> {
  return {
  [ALL_GYMS_TEST_EMAIL]: {
    profile: {
      email: ALL_GYMS_TEST_EMAIL,
      name: 'DIEGO RAMÍREZ',
      phone: '+52 55 1234 5678',
      birthdate: '14 MAR 1994',
      branch: 'Roma Sur',
    },
    membership: {
      plan: 'ALL GYMS · MENSUAL',
      branch: 'Roma Sur',
      tierKey: 'all',
      expiresAt: '2026-07-20',
      visits: 18,
      streak: 7,
      daysLeft: 12,
      accessCode: 'ML-DIEGO-2026-ALLGYMS',
      status: 'active',
      graceEndsAt: null,
    },
    history: [
      { visitedAt: '2026-06-18T07:30:00.000Z', branch: 'Roma Sur',   durationMinutes: 84 },
      { visitedAt: '2026-06-16T07:15:00.000Z', branch: 'Santa Fe',   durationMinutes: 58 },
      { visitedAt: '2026-06-14T16:00:00.000Z', branch: 'Roma Sur',   durationMinutes: 122 },
      { visitedAt: '2026-06-12T07:45:00.000Z', branch: 'Condesa',    durationMinutes: 71 },
      { visitedAt: '2026-06-10T17:00:00.000Z', branch: 'Roma Sur',   durationMinutes: 105 },
      { visitedAt: '2026-06-07T08:00:00.000Z', branch: 'Interlomas', durationMinutes: 93 },
    ],
    orders: [
      {
        id: '#ML-240619',
        date: '2026-06-19',
        status: 'ready',
        items: [
          { name: 'Pre-Entreno Bestia',  flav: 'Mango Chamoy', img: '/assets/prod-pre-mango.jpg', qty: 1 },
          { name: 'Whey Protein 5LBS',   flav: 'Strawberry',   img: '/assets/prod-whey-strawberry.jpg', qty: 1 },
        ],
        total: 2080,
        paymentMethod: 'card',
        delivery: 'pickup',
        branch: 'Roma Sur',
      },
      {
        id: '#ML-240601',
        date: '2026-06-01',
        status: 'done',
        items: [{ name: 'Shaker Loco', flav: '700ml', img: '/assets/mucho-loco-logo.jpg', qty: 1 }],
        total: 290,
        paymentMethod: 'cash',
        delivery: 'pickup',
        branch: 'Roma Sur',
        deliveredAt: '2026-06-01T18:42:00Z',
      },
    ],
  },
  [SINGLE_GYM_TEST_EMAIL]: {
    profile: {
      email: SINGLE_GYM_TEST_EMAIL,
      name: 'VALERIA TORRES',
      phone: '+52 55 9876 5432',
      birthdate: '02 SEP 1997',
      branch: 'Condesa',
    },
    membership: {
      plan: '1 GYM · MENSUAL',
      branch: 'Condesa',
      tierKey: 'single',
      expiresAt: '2026-08-05',
      visits: 9,
      streak: 3,
      daysLeft: 27,
      accessCode: 'ML-VALERIA-2026-CONDESA',
      // A propósito en 'grace' (no 'active') — demuestra el aviso de pago
      // fallido/periodo de gracia en el dashboard sin tocar al usuario 'all
      // gyms'. Ver AccessStatus en @mucho-loco/types.
      status: 'grace',
      graceEndsAt: '2026-06-22',
    },
    // Todas las visitas en Condesa a propósito — su membresía no da acceso a
    // otra sucursal (ver CLAUDE.md raíz, "Membresía y alcance de acceso").
    history: [
      { visitedAt: '2026-06-18T18:00:00.000Z', branch: 'Condesa', durationMinutes: 55 },
      { visitedAt: '2026-06-15T18:30:00.000Z', branch: 'Condesa', durationMinutes: 70 },
      { visitedAt: '2026-06-11T19:00:00.000Z', branch: 'Condesa', durationMinutes: 48 },
    ],
    orders: [
      {
        id: '#ML-240610',
        date: '2026-06-10',
        status: 'done',
        items: [{ name: 'Shaker Loco', flav: '700ml', img: '/assets/mucho-loco-logo.jpg', qty: 1 }],
        total: 290,
        paymentMethod: 'card',
        delivery: 'pickup',
        branch: 'Condesa',
        deliveredAt: '2026-06-10T17:15:00Z',
      },
    ],
  },
  };
}

const RECORDS: Record<string, UserRecord> = globalThis.__mlUserRecords ?? (globalThis.__mlUserRecords = seedRecords());

/** Cuenta real (self-signup) sin dato curado — perfil genérico pero con la identidad real, no "Diego" para todo el mundo. */
function fallbackRecord(email: string): UserRecord {
  const displayName = email.split('@')[0].toUpperCase();
  return {
    profile: { email, name: displayName, phone: '', birthdate: '', branch: 'Roma Sur' },
    membership: {
      plan: 'ALL GYMS · MENSUAL',
      branch: 'Roma Sur',
      tierKey: 'all',
      expiresAt: isoDate(addDays(new Date(), 30)),
      visits: 0,
      streak: 0,
      daysLeft: 30,
      accessCode: `ML-${displayName}-2026`,
      status: 'active',
      graceEndsAt: null,
    },
    history: [],
    orders: [],
  };
}

// Cachea el fallback la primera vez que se ve un email desconocido — si no,
// cada llamada devolvería un objeto nuevo y createOrder() perdería el pedido
// en la siguiente lectura (nadie más queda con la referencia mutada).
function getRecord(email: string): UserRecord {
  if (!RECORDS[email]) {
    RECORDS[email] = fallbackRecord(email);
  }
  return RECORDS[email];
}

/** Pedido inválido (producto inexistente, efectivo a domicilio). Equivale al
 *  400/404 que devuelve el backend real — `POST /api/orders` traduce ambos al
 *  mismo status, ver su route handler. */
export class OrderValidationError extends Error {
  readonly name = 'OrderValidationError';
}

export class UserMockDatasource implements IUserRepository {
  async getProfile(email: string): Promise<UserProfile> {
    await delay(200);
    return getRecord(email).profile;
  }

  async getMembership(email: string): Promise<MembershipInfo> {
    await delay(150);
    return getRecord(email).membership;
  }

  /** Simula la pasarela de pago cobrando de nuevo la tarjeta en archivo —
   *  siempre tiene éxito (no hay pasarela real todavía). Saca al socio de
   *  'grace'/'expired' y extiende su vigencia un mes desde hoy, sin importar
   *  cuánto llevaba vencida (mismo criterio que branch-app al renovar en
   *  mostrador). */
  async retryMembershipPayment(email: string): Promise<MembershipInfo> {
    await delay(400);
    const record = getRecord(email);
    record.membership = {
      ...record.membership,
      status: 'active',
      graceEndsAt: null,
      expiresAt: isoDate(addDays(new Date(), 30)),
      daysLeft: 30,
    };
    return record.membership;
  }

  async getVisitHistory(email: string): Promise<Visit[]> {
    await delay(130);
    return getRecord(email).history;
  }

  async getOrders(email: string): Promise<Order[]> {
    await delay(170);
    return getRecord(email).orders;
  }

  /** Mismas reglas que UsersService.createOrder() del backend: el total se
   *  calcula aquí desde el catálogo, nunca se recibe del cliente, y efectivo
   *  exige "recoger en gym". Si esto se desviara del backend, el swap de
   *  datasource cambiaría el comportamiento del checkout — por eso el mock
   *  imita la regla en vez de confiar en quien lo llama. */
  async createOrder(
    email: string,
    lines: NewOrderLine[],
    paymentMethod: OnlinePaymentMethod,
    delivery: 'pickup' | 'home',
    lang: Lang,
  ): Promise<Order> {
    await delay(150);
    if (paymentMethod === 'cash' && delivery !== 'pickup') {
      throw new OrderValidationError('cash payment method requires pickup delivery');
    }

    const items: OrderItem[] = [];
    let subtotal = 0;
    for (const line of lines) {
      const product = PRODUCTS.find((p) => p.id === line.productId);
      if (!product) {
        throw new OrderValidationError(`Product not found: ${line.productId}`);
      }
      items.push({ name: product.name[lang], flav: product.flav[lang], img: product.img, qty: line.qty });
      subtotal += product.price * line.qty;
    }

    const record = getRecord(email);
    // Efectivo solo aplica con "recoger en gym" (ver CLAUDE.md raíz, "Pagos en
    // línea") — el pedido queda pendiente de pago hasta que se cobra en
    // mostrador, no "listo para retiro" como si ya estuviera pagado.
    const status = paymentMethod === 'cash' ? 'pending_payment' : 'ready';
    const order: Order = {
      id: `#ML-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      status,
      items,
      total: subtotal + (delivery === 'home' ? HOME_SHIPPING_FEE : 0),
      paymentMethod,
      delivery,
      branch: delivery === 'pickup' ? record.profile.branch : undefined,
    };
    record.orders = [order, ...record.orders];
    return order;
  }
}
