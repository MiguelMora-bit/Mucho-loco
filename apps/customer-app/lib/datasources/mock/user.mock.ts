import type { UserProfile, MembershipInfo, Visit, Order, OrderItem } from '@mucho-loco/types';
import { delay } from './delay';

const MONTHS_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

export function formatOrderDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

const MOCK_PROFILE: UserProfile = {
  email: 'diego@mucholoco.mx',
  name: 'DIEGO RAMÍREZ',
  phone: '+52 55 1234 5678',
  birthdate: '14 MAR 1994',
  branch: 'Roma Sur',
};

const MOCK_MEMBERSHIP: MembershipInfo = {
  plan: 'ALL GYMS · MENSUAL',
  branch: 'Roma Sur',
  expiresAt: '20 JUL 2026',
  visits: 18,
  streak: 7,
  daysLeft: 12,
};

const MOCK_HISTORY: Visit[] = [
  { day: '18', month: 'JUN', branch: 'Roma Sur',   duration: '1h 24m' },
  { day: '16', month: 'JUN', branch: 'Santa Fe',   duration: '58m' },
  { day: '14', month: 'JUN', branch: 'Roma Sur',   duration: '2h 02m' },
  { day: '12', month: 'JUN', branch: 'Condesa',    duration: '1h 11m' },
  { day: '10', month: 'JUN', branch: 'Roma Sur',   duration: '1h 45m' },
  { day: '07', month: 'JUN', branch: 'Interlomas', duration: '1h 33m' },
];

let MOCK_ORDERS: Order[] = [
  {
    id: '#ML-240619',
    date: '19 JUN 2026',
    status: 'ready',
    items: [
      { name: 'Pre-Entreno Bestia',  flav: 'Mango Chamoy', img: '/assets/prod-pre-mango.jpg', qty: 1 },
      { name: 'Whey Protein 5LBS',   flav: 'Strawberry',   img: '/assets/prod-whey-strawberry.jpg', qty: 1 },
    ],
    total: 2080,
  },
  {
    id: '#ML-240601',
    date: '01 JUN 2026',
    status: 'done',
    items: [{ name: 'Shaker Loco', flav: '700ml', img: '/assets/mucho-loco-logo.jpg', qty: 1 }],
    total: 290,
  },
];

export class UserMockDatasource {
  async getProfile(): Promise<UserProfile> {
    await delay(200);
    return MOCK_PROFILE;
  }

  async getMembership(): Promise<MembershipInfo> {
    await delay(150);
    return MOCK_MEMBERSHIP;
  }

  async getVisitHistory(): Promise<Visit[]> {
    await delay(130);
    return MOCK_HISTORY;
  }

  async getOrders(): Promise<Order[]> {
    await delay(170);
    return MOCK_ORDERS;
  }

  async createOrder(items: OrderItem[], total: number): Promise<Order> {
    await delay(150);
    const order: Order = {
      id: `#ML-${Date.now().toString().slice(-6)}`,
      date: formatOrderDate(new Date()),
      status: 'ready',
      items,
      total,
    };
    MOCK_ORDERS = [order, ...MOCK_ORDERS];
    return order;
  }
}
