import type { UserProfile, MembershipInfo, Visit, Order, OrderItem, OnlinePaymentMethod } from '@mucho-loco/types';
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

// Mismo formato 'DD MES YYYY' que el resto de MembershipInfo (ver expiresAt
// más abajo) — duplicado a propósito del helper análogo en
// branch-app/src/lib/datasources/mock/membership.mock.ts, no compartido en
// runtime entre apps (ver CLAUDE.md raíz).
function formatDate(d: Date): string {
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace('.', '');
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
      expiresAt: '20 JUL 2026',
      visits: 18,
      streak: 7,
      daysLeft: 12,
      accessCode: 'ML-DIEGO-2026-ALLGYMS',
      status: 'active',
      graceEndsAt: null,
    },
    history: [
      { day: '18', month: 'JUN', branch: 'Roma Sur',   duration: '1h 24m' },
      { day: '16', month: 'JUN', branch: 'Santa Fe',   duration: '58m' },
      { day: '14', month: 'JUN', branch: 'Roma Sur',   duration: '2h 02m' },
      { day: '12', month: 'JUN', branch: 'Condesa',    duration: '1h 11m' },
      { day: '10', month: 'JUN', branch: 'Roma Sur',   duration: '1h 45m' },
      { day: '07', month: 'JUN', branch: 'Interlomas', duration: '1h 33m' },
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
      expiresAt: '05 AGO 2026',
      visits: 9,
      streak: 3,
      daysLeft: 27,
      accessCode: 'ML-VALERIA-2026-CONDESA',
      // A propósito en 'grace' (no 'active') — demuestra el aviso de pago
      // fallido/periodo de gracia en el dashboard sin tocar al usuario 'all
      // gyms'. Ver AccessStatus en @mucho-loco/types.
      status: 'grace',
      graceEndsAt: '22 JUN 2026',
    },
    // Todas las visitas en Condesa a propósito — su membresía no da acceso a
    // otra sucursal (ver CLAUDE.md raíz, "Membresía y alcance de acceso").
    history: [
      { day: '18', month: 'JUN', branch: 'Condesa', duration: '55m' },
      { day: '15', month: 'JUN', branch: 'Condesa', duration: '1h 10m' },
      { day: '11', month: 'JUN', branch: 'Condesa', duration: '48m' },
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
      expiresAt: '—',
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

export class UserMockDatasource {
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
      expiresAt: formatDate(addDays(new Date(), 30)),
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

  async createOrder(email: string, items: OrderItem[], total: number, paymentMethod: OnlinePaymentMethod, delivery: 'pickup' | 'home'): Promise<Order> {
    await delay(150);
    const record = getRecord(email);
    const order: Order = {
      id: `#ML-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      status: 'ready',
      items,
      total,
      paymentMethod,
      delivery,
      branch: delivery === 'pickup' ? record.profile.branch : undefined,
    };
    record.orders = [order, ...record.orders];
    return order;
  }
}
