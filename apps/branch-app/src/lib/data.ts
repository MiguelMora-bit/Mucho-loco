import type { AttendanceEntry, BranchInventoryLevel, CashRegisterShift, CounterSale, MemberAccessRecord, MembershipPayment, PickupOrder } from '@mucho-loco/types';

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
// Los primeros dos códigos son EXACTAMENTE los que customer-app genera para
// sus usuarios de prueba reales (lib/datasources/mock/user.mock.ts) — así el
// QR que un socio ve en su dashboard sí se puede escanear acá de verdad.
// Diego (tier 'all') entra en cualquier sucursal; Valeria (tier 'single',
// Condesa) debe ser RECHAZADA si se escanea en otra sucursal (Roma Sur, donde
// están dados de alta el staff de prueba) — ver CLAUDE.md raíz.
export const MEMBER_ACCESS_RECORDS: MemberAccessRecord[] = [
  { qrCode: 'ML-DIEGO-2026-ALLGYMS', memberName: 'Diego Ramírez', status: 'active', expiresAt: '20 JUL 2026', tierKey: 'all', homeBranchId: 1, homeBranchName: 'Roma Sur' },
  { qrCode: 'ML-VALERIA-2026-CONDESA', memberName: 'Valeria Torres', status: 'active', expiresAt: '05 AGO 2026', tierKey: 'single', homeBranchId: 3, homeBranchName: 'Condesa' },
  { qrCode: 'ML-QR-ANA02', memberName: 'Ana López', status: 'grace', expiresAt: '05 JUN 2026', tierKey: 'all', homeBranchId: 1, homeBranchName: 'Roma Sur' },
  { qrCode: 'ML-QR-CARLOS03', memberName: 'Carlos Mendoza', status: 'expired', expiresAt: '10 MAY 2026', tierKey: 'all', homeBranchId: 1, homeBranchName: 'Roma Sur' },
  // Dados de alta con huella en vez de QR (sin la app) — mismo qrCode interno
  // que todos (usado por mostrador para buscar/renovar), pero el acceso real
  // se valida por fingerprintId. Rosa entra en cualquier sucursal; Luis (tier
  // 'single', Interlomas) debe ser RECHAZADO si se escanea en Roma Sur.
  { qrCode: 'ML-QR-ROSA04', fingerprintId: 'FP-DEMO-ROSA', memberName: 'Rosa Jiménez', status: 'active', expiresAt: '18 AGO 2026', tierKey: 'all', homeBranchId: 1, homeBranchName: 'Roma Sur' },
  { qrCode: 'ML-QR-LUIS05', fingerprintId: 'FP-DEMO-LUIS', memberName: 'Luis Herrera', status: 'active', expiresAt: '22 AGO 2026', tierKey: 'single', homeBranchId: 4, homeBranchName: 'Interlomas' },
  // Comparte nombre de pila con Carlos Mendoza a propósito — buscar "Carlos"
  // en el método de acceso por nombre debe dar 'ambiguous' con los dos, para
  // demostrar que el staff necesita desambiguar antes de decidir el acceso.
  { qrCode: 'ML-QR-CARLOS06', memberName: 'Carlos Vega', status: 'active', expiresAt: '30 SEP 2026', tierKey: 'all', homeBranchId: 1, homeBranchName: 'Roma Sur' },
];

function daysAgo(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// Log of membership payments (sign-up or renewal) made at the counter. Seed
// history (branchId 1, last week) is illustrative only, purely so
// ReportsPage has something to show on first load — real entries get
// pushed to this same array by membership.mock.ts.
export const MEMBERSHIP_PAYMENTS: MembershipPayment[] = [
  { id: '#MP-SEED-1', branchId: 1, qrCode: 'ML-QR-SEED1', memberName: 'Fernanda Ruiz', phone: '55 1122 3344', tierKey: 'single', periodKey: 'monthly', amount: 890, paymentMethod: 'card', isNewMember: true, createdAt: daysAgo(2, 10) },
  { id: '#MP-SEED-2', branchId: 1, qrCode: 'ML-QR-ANA02', memberName: 'Ana López', phone: '55 2233 4455', tierKey: 'all', periodKey: 'monthly', amount: 1090, paymentMethod: 'cash', isNewMember: false, createdAt: daysAgo(5, 9) },
];

// Pushed to by counterSale.mock.ts on each sale — history didn't exist before
// (createSale only returned the sale and mutated BRANCH_INVENTORY), needed
// now so cashRegisterShift.mock.ts can sum "what came in" for a shift. Seed
// history (branchId 1, last week) is illustrative only, same reasoning as
// MEMBERSHIP_PAYMENTS above.
export const COUNTER_SALES: CounterSale[] = [
  { id: '#CS-SEED-1', branchId: 1, items: [{ productId: 'p7', productName: 'Pre-Entreno Bestia · Mango Chamoy', qty: 2, unitPrice: 790 }], total: 1580, paymentMethod: 'card', createdAt: daysAgo(1, 8) },
  { id: '#CS-SEED-2', branchId: 1, items: [{ productId: 'p18', productName: 'Shaker Loco', qty: 3, unitPrice: 290 }], total: 870, paymentMethod: 'cash', createdAt: daysAgo(1, 18) },
  { id: '#CS-SEED-3', branchId: 1, items: [{ productId: 'p9', productName: 'Mucho Loco Energy 473ml · Mora-Uva', qty: 4, unitPrice: 45 }], total: 180, paymentMethod: 'cash', createdAt: daysAgo(3, 12) },
  { id: '#CS-SEED-4', branchId: 1, items: [{ productId: 'p7', productName: 'Pre-Entreno Bestia · Mango Chamoy', qty: 1, unitPrice: 790 }, { productId: 'p13', productName: 'Goma de Mascar Energética', qty: 2, unitPrice: 95 }], total: 980, paymentMethod: 'transfer', createdAt: daysAgo(4, 17) },
  { id: '#CS-SEED-5', branchId: 1, items: [{ productId: 'p18', productName: 'Shaker Loco', qty: 1, unitPrice: 290 }], total: 290, paymentMethod: 'card', createdAt: daysAgo(6, 9) },
];

// Mutated by cashRegisterShift.mock.ts — closeShift() flips status, a fresh
// 'open' one is only created lazily the next time getOpenShift() is called.
export const CASH_REGISTER_SHIFTS: CashRegisterShift[] = [];

// Mutated by attendance.mock.ts — clockOut() fills clockOut on the entry
// clockIn() created. Luis already has a closed entry from earlier today so
// AttendancePage's team view isn't empty on first load; Ana (manager, the
// staffDirectory/test account) starts with none so clocking in can be
// demoed cleanly.
export const ATTENDANCE_ENTRIES: AttendanceEntry[] = [
  { id: '#ATT-SEED-1', branchId: 1, staffEmail: 'luis@mucholoco.mx', staffName: 'Luis', clockIn: daysAgo(0, 5), clockOut: daysAgo(0, 9) },
];
