/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- jest.fn() sin generics: el `tx` de Prisma es deliberadamente `any`. */
import { ChargesService, counterChargeMethod } from './charges.service';

// Claves de mentira a propósito: el test comprueba que se COPIAN al renglón.
const CATEGORIES = [
  {
    id: 'supplement',
    satProductKey: 'SAT-SUP',
    satUnitKey: 'H87',
    taxRateBp: 1600,
  },
  {
    id: 'merch',
    satProductKey: 'SAT-MERCH',
    satUnitKey: 'H87',
    taxRateBp: 1600,
  },
  {
    id: 'shipping',
    satProductKey: 'SAT-SHIP',
    satUnitKey: 'E48',
    taxRateBp: 1600,
  },
  {
    id: 'unclassified',
    satProductKey: '01010101',
    satUnitKey: 'H87',
    taxRateBp: 1600,
  },
  {
    id: 'gym_membership',
    satProductKey: 'SAT-GYM',
    satUnitKey: 'E48',
    taxRateBp: 1600,
  },
];

function fakeTx() {
  return {
    taxCategory: {
      findMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(CATEGORIES.filter((c) => where.id.in.includes(c.id))),
      ),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'p7', taxCategoryId: 'supplement' },
        { id: 'p18', taxCategoryId: 'merch' },
      ]),
    },
    membershipTier: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        key: 'all',
        name: { es: 'TODAS LAS SUCURSALES', en: 'ALL GYMS' },
        taxCategoryId: 'gym_membership',
      }),
    },
    branch: {
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ id: 1, name: 'ROMA SUR' }),
    },
    charge: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    chargeLine: { createMany: jest.fn() },
    fiscalReceipt: { create: jest.fn() },
  };
}

const item = (overrides: Record<string, unknown>) => ({
  id: 'i',
  orderId: 'o1',
  name: 'Pre-Entreno Bestia',
  flav: 'Mango Chamoy',
  img: '/a.jpg',
  qty: 1,
  productId: 'p7',
  unitPrice: 790,
  ...overrides,
});

const order = (overrides: Record<string, unknown> = {}) => ({
  id: 'o1',
  userId: 'u1',
  branchId: 1,
  total: 790,
  items: [item({})],
  ...overrides,
});

describe('ChargesService', () => {
  const service = new ChargesService();
  let tx: ReturnType<typeof fakeTx>;
  const paidAt = new Date('2026-09-14T18:00:00.000Z');

  beforeEach(() => {
    tx = fakeTx();
  });

  const chargeRow = () => tx.charge.createMany.mock.calls[0][0].data[0];
  const lineRows = () => tx.chargeLine.createMany.mock.calls[0][0].data;

  describe('recordOrder', () => {
    it('writes one charge in centavos, tied to its order', async () => {
      await service.recordOrder(tx as never, order() as never, {
        method: 'card_debit',
        paidAt,
      });

      expect(chargeRow()).toMatchObject({
        source: 'order',
        method: 'card_debit',
        totalCents: 79000,
        paidAt,
        branchId: 1,
        userId: 'u1',
        orderId: 'o1',
      });
    });

    // El envío es concepto aparte para el SAT, y sale de la diferencia contra
    // el total: no depende de que la tarifa siga siendo la misma.
    it('prices each line as quoted, and adds shipping as its own line', async () => {
      const home = order({
        branchId: null,
        total: 790 * 2 + 290 + 99,
        items: [
          item({ qty: 2 }),
          item({
            productId: 'p18',
            name: 'Shaker Loco',
            flav: '',
            unitPrice: 290,
          }),
        ],
      });

      await service.recordOrder(tx as never, home as never, {
        method: 'card_credit',
        paidAt,
      });

      expect(lineRows()).toEqual([
        expect.objectContaining({
          description: 'Pre-Entreno Bestia · Mango Chamoy',
          qty: 2,
          unitPriceCents: 79000,
          taxCategoryId: 'supplement',
        }),
        expect.objectContaining({
          description: 'Shaker Loco',
          qty: 1,
          unitPriceCents: 29000,
          taxCategoryId: 'merch',
        }),
        expect.objectContaining({
          description: 'Envío a domicilio',
          qty: 1,
          unitPriceCents: 9900,
          taxCategoryId: 'shipping',
        }),
      ]);
      expect(chargeRow()).toMatchObject({ branchId: null, totalCents: 196900 });
    });

    // Recategorizar un producto mañana no puede cambiar lo que se cobró hoy.
    it('freezes the SAT key and tax rate the category had on the day of the charge', async () => {
      await service.recordOrder(tx as never, order() as never, {
        method: 'cash',
        paidAt,
      });

      expect(lineRows()[0]).toMatchObject({
        taxCategoryId: 'supplement',
        satProductKey: 'SAT-SUP',
        satUnitKey: 'H87',
        taxRateBp: 1600,
      });
    });

    it('books an order from before prices were frozen as one unclassified line for its total', async () => {
      const legacy = order({
        total: 1290,
        items: [item({ productId: null, unitPrice: null })],
      });

      await service.recordOrder(tx as never, legacy as never, {
        method: 'cash',
        paidAt,
      });

      expect(lineRows()).toEqual([
        expect.objectContaining({
          description: 'Pedido o1',
          qty: 1,
          unitPriceCents: 129000,
          taxCategoryId: 'unclassified',
        }),
      ]);
    });

    it('keeps the quoted price of a product that left the catalog, unclassified', async () => {
      tx.product.findMany.mockResolvedValue([]);

      await service.recordOrder(tx as never, order() as never, {
        method: 'cash',
        paidAt,
      });

      expect(lineRows()[0]).toMatchObject({
        unitPriceCents: 79000,
        taxCategoryId: 'unclassified',
      });
    });

    // Una factura exige que sus conceptos sumen el total. Mejor tronar al
    // registrar que en el timbrado de fin de mes.
    it('refuses a charge whose lines do not add up to its total', async () => {
      const short = order({ total: 500 });

      await expect(
        service.recordOrder(tx as never, short as never, {
          method: 'cash',
          paidAt,
        }),
      ).rejects.toThrow('suman');
      expect(tx.charge.createMany).not.toHaveBeenCalled();
    });

    // Stripe reentrega webhooks. ON CONFLICT DO NOTHING en vez de un error:
    // dentro de una transacción, un error de índice único la abortaría entera.
    it('does nothing when that order already has its charge', async () => {
      tx.charge.createMany.mockResolvedValue({ count: 0 });

      const recorded = await service.recordOrder(
        tx as never,
        order() as never,
        { method: 'cash', paidAt },
      );

      expect(recorded).toBe(false);
      expect(tx.charge.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
      expect(tx.chargeLine.createMany).not.toHaveBeenCalled();
    });
  });

  describe('recordCounterSale', () => {
    it('records a walk-in sale with no customer account, dated when it was rung up', async () => {
      const createdAt = new Date('2026-09-14T12:00:00.000Z');
      const sale = {
        id: 'cs1',
        branchId: 3,
        total: 790 + 290,
        paymentMethod: 'transfer',
        createdAt,
        items: [
          {
            productId: 'p7',
            productName: 'Pre-Entreno Bestia · Mango Chamoy',
            qty: 1,
            unitPrice: 790,
          },
          {
            productId: 'p18',
            productName: 'Shaker Loco · 700ml',
            qty: 1,
            unitPrice: 290,
          },
        ],
      };

      await service.recordCounterSale(tx as never, sale as never);

      expect(chargeRow()).toMatchObject({
        source: 'counter_sale',
        method: 'transfer',
        paidAt: createdAt,
        branchId: 3,
        userId: null,
        counterSaleId: 'cs1',
        totalCents: 108000,
      });
      expect(
        lineRows().map((l: { taxCategoryId: string }) => l.taxCategoryId),
      ).toEqual(['supplement', 'merch']);
    });
  });

  describe('recordMembership', () => {
    it('describes the plan in Spanish and bills it under the tier category', async () => {
      await service.recordMembership(tx as never, {
        source: 'membership_subscription',
        method: 'card_credit',
        paidAt,
        userId: 'u1',
        branchId: 1,
        tierKey: 'all',
        periodKey: 'monthly',
        totalCents: 163500,
        origin: { stripeInvoiceId: 'in_1' },
      });

      expect(chargeRow()).toMatchObject({
        source: 'membership_subscription',
        stripeInvoiceId: 'in_1',
        totalCents: 163500,
        branchId: 1,
      });
      expect(lineRows()).toEqual([
        expect.objectContaining({
          description: 'Membresía Mensual · TODAS LAS SUCURSALES · ROMA SUR',
          qty: 1,
          unitPriceCents: 163500,
          taxCategoryId: 'gym_membership',
          satUnitKey: 'E48',
        }),
      ]);
    });

    it('fails loudly on a category that does not exist', async () => {
      tx.membershipTier.findUniqueOrThrow.mockResolvedValue({
        key: 'all',
        name: { es: 'X', en: 'X' },
        taxCategoryId: 'fantasma',
      });

      await expect(
        service.recordMembership(tx as never, {
          source: 'counter_membership',
          method: 'cash',
          paidAt,
          userId: 'u1',
          branchId: 1,
          tierKey: 'all',
          periodKey: 'visit',
          totalCents: 20000,
          origin: { membershipPaymentId: 'mp1' },
        }),
      ).rejects.toThrow('fantasma');
    });
  });
});

// Spec 009: el SAT distingue crédito (04) de débito (28) en la forma de pago.
describe('counterChargeMethod', () => {
  it('records the card type when the counter captured it', () => {
    expect(counterChargeMethod('card', 'credit')).toBe('card_credit');
    expect(counterChargeMethod('card', 'debit')).toBe('card_debit');
  });

  it('keeps plain card without a type (provisional 04), and ignores a type on cash or transfer', () => {
    expect(counterChargeMethod('card', null)).toBe('card');
    expect(counterChargeMethod('cash', 'debit')).toBe('cash');
    expect(counterChargeMethod('transfer', undefined)).toBe('transfer');
  });
});
