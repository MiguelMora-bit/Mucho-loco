/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CounterSalesService } from './counter-sales.service';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChargesService } from '../charges/charges.service';

const pre = {
  id: 'p7',
  name: { es: 'Pre-Entreno Bestia', en: 'Beast Pre-Workout' },
  flav: { es: 'Mango Chamoy', en: 'Mango Chamoy' },
  price: 790,
};
const energy = {
  id: 'p9',
  name: { es: 'Mucho Loco Energy 473ml', en: 'Mucho Loco Energy 473ml' },
  flav: { es: 'Mora-Uva', en: 'Berry-Grape' },
  price: 45,
};

describe('CounterSalesService', () => {
  let service: CounterSalesService;
  let prisma: {
    product: { findMany: jest.Mock };
    counterSale: { create: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let inventory: { decrementForSale: jest.Mock };
  let charges: { recordCounterSale: jest.Mock };

  beforeEach(async () => {
    prisma = {
      product: { findMany: jest.fn() },
      counterSale: { create: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    inventory = { decrementForSale: jest.fn() };
    charges = { recordCounterSale: jest.fn().mockResolvedValue(true) };
    const module = await Test.createTestingModule({
      providers: [
        CounterSalesService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventory },
        { provide: ChargesService, useValue: charges },
      ],
    }).compile();
    service = module.get(CounterSalesService);
  });

  function saleRow(total: number, items: unknown[]) {
    return { id: 'cs1', branchId: 1, total, paymentMethod: 'cash', createdAt: new Date(), items };
  }

  // Misma regla que la tienda en línea: el cliente (aquí, el cajero) manda
  // producto y cantidad, el precio lo pone el catálogo.
  it('prices the sale from the catalog and sums the total server-side', async () => {
    prisma.product.findMany.mockResolvedValue([pre, energy]);
    prisma.counterSale.create.mockImplementation(({ data }: never) =>
      saleRow((data as { total: number }).total, (data as { items: { create: unknown[] } }).items.create),
    );

    const sale = await service.createSale(
      1,
      { picks: [{ productId: 'p7', qty: 2 }, { productId: 'p9', qty: 4 }], paymentMethod: 'cash' },
      'es',
    );

    expect(sale.total).toBe(790 * 2 + 45 * 4);
    expect(sale.items).toEqual([
      { productId: 'p7', productName: 'Pre-Entreno Bestia · Mango Chamoy', qty: 2, unitPrice: 790 },
      { productId: 'p9', productName: 'Mucho Loco Energy 473ml · Mora-Uva', qty: 4, unitPrice: 45 },
    ]);
  });

  it('decrements local stock for every line, inside the sale transaction', async () => {
    prisma.product.findMany.mockResolvedValue([pre]);
    prisma.counterSale.create.mockResolvedValue(saleRow(1580, []));

    await service.createSale(1, { picks: [{ productId: 'p7', qty: 2 }], paymentMethod: 'card' }, 'es');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // El nombre viaja para que el error de stock diga "no hay suficiente
    // Pre-Entreno Bestia" y no "de p7" — ver common/error-codes.ts.
    expect(inventory.decrementForSale).toHaveBeenCalledWith(
      prisma, 1, 'p7', 2, 'Pre-Entreno Bestia · Mango Chamoy',
    );
  });

  // Si el stock no alcanza, no puede quedar una venta cobrada sin producto que
  // entregar — por eso el descuento va antes del create, en la misma
  // transacción.
  it('does not record the sale when stock is insufficient', async () => {
    prisma.product.findMany.mockResolvedValue([pre]);
    inventory.decrementForSale.mockRejectedValue(new BadRequestException('Stock insuficiente'));

    await expect(
      service.createSale(1, { picks: [{ productId: 'p7', qty: 99 }], paymentMethod: 'cash' }, 'es'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.counterSale.create).not.toHaveBeenCalled();
    expect(charges.recordCounterSale).not.toHaveBeenCalled();
  });

  // Lo que cobra mostrador es ingreso: entra al registro de cobros en la misma
  // transacción que la venta y el descuento de stock.
  it('records the sale in the charges ledger, inside the sale transaction', async () => {
    prisma.product.findMany.mockResolvedValue([pre]);
    const row = saleRow(790, []);
    prisma.counterSale.create.mockResolvedValue(row);

    await service.createSale(1, { picks: [{ productId: 'p7', qty: 1 }], paymentMethod: 'card' }, 'es');

    expect(charges.recordCounterSale).toHaveBeenCalledWith(prisma, row);
  });

  it('rejects a product that is not in the catalog before opening a transaction', async () => {
    prisma.product.findMany.mockResolvedValue([]);

    await expect(
      service.createSale(1, { picks: [{ productId: 'fantasma', qty: 1 }], paymentMethod: 'cash' }, 'es'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('freezes the item name in the language the sale was made in', async () => {
    prisma.product.findMany.mockResolvedValue([pre]);
    prisma.counterSale.create.mockImplementation(({ data }: never) =>
      saleRow(790, (data as { items: { create: unknown[] } }).items.create),
    );

    const sale = await service.createSale(
      1,
      { picks: [{ productId: 'p7', qty: 1 }], paymentMethod: 'cash' },
      'en',
    );

    expect(sale.items[0].productName).toBe('Beast Pre-Workout · Mango Chamoy');
  });
});
