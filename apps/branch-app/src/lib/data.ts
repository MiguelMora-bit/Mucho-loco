import type { BranchInventoryLevel, MemberAccessRecord, MembershipPayment, PickupOrder } from '@mucho-loco/types';

export const PICKUP_ORDERS: PickupOrder[] = [
  {
    id: '#ML-240619',
    branchId: 1,
    customerName: 'Diego Ramírez',
    items: [
      { name: 'Pre-Entreno Bestia', flav: 'Mango Chamoy', img: '/assets/prod-pre-mango.jpg', qty: 1 },
      { name: 'Whey Protein 5LBS', flav: 'Strawberry', img: '/assets/prod-whey-strawberry.jpg', qty: 1 },
    ],
    total: 2080,
    status: 'ready',
    placedAt: '19 JUN 2026',
  },
  {
    id: '#ML-240617',
    branchId: 1,
    customerName: 'Ana López',
    items: [{ name: 'Shaker Loco', flav: '700ml', img: '/assets/mucho-loco-logo.jpg', qty: 2 }],
    total: 580,
    status: 'ready',
    placedAt: '17 JUN 2026',
  },
  {
    id: '#ML-240601',
    branchId: 1,
    customerName: 'Diego Ramírez',
    items: [{ name: 'Shaker Loco', flav: '700ml', img: '/assets/mucho-loco-logo.jpg', qty: 1 }],
    total: 290,
    status: 'delivered',
    placedAt: '01 JUN 2026',
  },
];

// Mutated in place by counterSale.mock.ts on each sale — same pattern as
// PICKUP_ORDERS' markDelivered mutating this array directly.
export const BRANCH_INVENTORY: BranchInventoryLevel[] = [
  { branchId: 1, productId: 'p1', productName: 'Whey Protein 5LBS · Strawberry', unitPrice: 1290, qty: 12 },
  { branchId: 1, productId: 'p7', productName: 'Pre-Entreno Bestia · Mango Chamoy', unitPrice: 790, qty: 18 },
  { branchId: 1, productId: 'p9', productName: 'Mucho Loco Energy 473ml · Mora-Uva', unitPrice: 45, qty: 40 },
  { branchId: 1, productId: 'p13', productName: 'Goma de Mascar Energética', unitPrice: 95, qty: 25 },
  { branchId: 1, productId: 'p11', productName: "BCAA's en polvo · Watermelon", unitPrice: 690, qty: 0 },
  { branchId: 1, productId: 'p18', productName: 'Shaker Loco', unitPrice: 290, qty: 9 },
];

// Mutated by membership.mock.ts on sign-up or renewal — same pattern as
// BRANCH_INVENTORY.
export const MEMBER_ACCESS_RECORDS: MemberAccessRecord[] = [
  { qrCode: 'ML-QR-DIEGO01', memberName: 'Diego Ramírez', status: 'active', expiresAt: '20 JUL 2026' },
  { qrCode: 'ML-QR-ANA02', memberName: 'Ana López', status: 'grace', expiresAt: '05 JUN 2026' },
  { qrCode: 'ML-QR-CARLOS03', memberName: 'Carlos Mendoza', status: 'expired', expiresAt: '10 MAY 2026' },
];

// Log of membership payments (sign-up or renewal) made at the counter.
export const MEMBERSHIP_PAYMENTS: MembershipPayment[] = [];
