/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';

const whey = {
  id: 'p1',
  name: { es: 'Whey Protein 5LBS', en: 'Whey Protein 5LBS' },
  flav: { es: 'Fresa', en: 'Strawberry' },
  price: 1290,
  img: '/assets/prod-whey-strawberry.jpg',
};
const shaker = {
  id: 'p18',
  name: { es: 'Shaker Loco', en: 'Shaker Loco' },
  flav: { es: '', en: '' },
  price: 290,
  img: '/assets/mucho-loco-logo.jpg',
};

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: {
    branchInventory: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      upsert: jest.Mock;
    };
    inventoryTransfer: { findMany: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      branchInventory: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      inventoryTransfer: { findMany: jest.fn(), create: jest.fn() },
      // El callback corre con el mismo objeto mock: alcanza para verificar qué
      // escrituras se piden y en qué orden, sin una base de datos real.
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    const module = await Test.createTestingModule({
      providers: [InventoryService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(InventoryService);
  });

  describe('getLevels', () => {
    it('resolves product name and price from the catalog, not from stored copies', async () => {
      prisma.branchInventory.findMany.mockResolvedValue([
        { branchId: 1, productId: 'p1', qty: 30, product: whey },
      ]);

      const levels = await service.getLevels('es');

      expect(levels).toEqual([
        {
          branchId: 1,
          productId: 'p1',
          productName: 'Whey Protein 5LBS · Fresa',
          unitPrice: 1290,
          qty: 30,
          img: '/assets/prod-whey-strawberry.jpg',
        },
      ]);
    });

    it('builds the display name in the requested language', async () => {
      prisma.branchInventory.findMany.mockResolvedValue([
        { branchId: 1, productId: 'p1', qty: 30, product: whey },
      ]);

      const [level] = await service.getLevels('en');

      expect(level.productName).toBe('Whey Protein 5LBS · Strawberry');
    });

    it('omits the separator for a product with no flavour', async () => {
      prisma.branchInventory.findMany.mockResolvedValue([
        { branchId: 1, productId: 'p18', qty: 120, product: shaker },
      ]);

      const [level] = await service.getLevels('es');

      expect(level.productName).toBe('Shaker Loco');
    });
  });

  describe('getGlobal', () => {
    it('sums the same product across branches into one row', async () => {
      prisma.branchInventory.findMany.mockResolvedValue([
        { branchId: 1, productId: 'p1', qty: 30, product: whey },
        { branchId: 2, productId: 'p1', qty: 20, product: whey },
        { branchId: 5, productId: 'p18', qty: 80, product: shaker },
      ]);

      const global = await service.getGlobal('es');

      expect(global).toEqual([
        { productId: 'p1', productName: 'Whey Protein 5LBS · Fresa', totalQty: 50 },
        { productId: 'p18', productName: 'Shaker Loco', totalQty: 80 },
      ]);
    });
  });

  describe('createTransfer', () => {
    const dto = { productId: 'p18', fromBranchId: 1, toBranchId: 3, qty: 15 };

    it('moves stock out of the source and into the destination in one transaction', async () => {
      prisma.branchInventory.findUnique.mockResolvedValue({ branchId: 1, productId: 'p18', qty: 120 });
      prisma.inventoryTransfer.create.mockResolvedValue({
        id: 't1',
        productId: 'p18',
        fromBranchId: 1,
        toBranchId: 3,
        qty: 15,
        createdAt: new Date('2026-08-20T14:00:00.000Z'),
        product: shaker,
        fromBranch: { name: 'ROMA SUR' },
        toBranch: { name: 'CONDESA' },
      });

      const transfer = await service.createTransfer(dto);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.branchInventory.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { qty: { decrement: 15 } } }),
      );
      expect(prisma.branchInventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { branchId: 3, productId: 'p18', qty: 15 },
          update: { qty: { increment: 15 } },
        }),
      );
      expect(transfer.fromBranchName).toBe('ROMA SUR');
      expect(transfer.toBranchName).toBe('CONDESA');
    });

    // Una sucursal no lista todo el catálogo: la fila del destino se abre con
    // la primera transferencia, no hace falta darla de alta antes.
    it('opens a level at the destination when it did not stock that product', async () => {
      prisma.branchInventory.findUnique.mockResolvedValue({ branchId: 1, productId: 'p1', qty: 30 });
      prisma.inventoryTransfer.create.mockResolvedValue({
        id: 't2', productId: 'p1', fromBranchId: 1, toBranchId: 3, qty: 5,
        createdAt: new Date(), product: whey,
        fromBranch: { name: 'ROMA SUR' }, toBranch: { name: 'CONDESA' },
      });

      await service.createTransfer({ productId: 'p1', fromBranchId: 1, toBranchId: 3, qty: 5 });

      expect(prisma.branchInventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { branchId: 3, productId: 'p1', qty: 5 } }),
      );
    });

    it('refuses to transfer more than the source has, writing nothing', async () => {
      prisma.branchInventory.findUnique.mockResolvedValue({ branchId: 1, productId: 'p18', qty: 5 });

      await expect(service.createTransfer(dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.branchInventory.update).not.toHaveBeenCalled();
      expect(prisma.inventoryTransfer.create).not.toHaveBeenCalled();
    });

    it('refuses a transfer from a branch that does not stock the product', async () => {
      prisma.branchInventory.findUnique.mockResolvedValue(null);

      await expect(service.createTransfer(dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    // Sin esto, "transferir" a la misma sucursal sería un decrement seguido de
    // un increment del mismo tamaño: cero efecto, pero un movimiento fantasma
    // en el historial auditable.
    it('refuses a transfer to the same branch before touching the database', async () => {
      await expect(
        service.createTransfer({ ...dto, toBranchId: dto.fromBranchId }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('decrementForSale', () => {
    it('decrements the level of the branch that sold', async () => {
      prisma.branchInventory.findUnique.mockResolvedValue({ branchId: 1, productId: 'p1', qty: 30 });

      await service.decrementForSale(prisma as never, 1, 'p1', 2);

      expect(prisma.branchInventory.update).toHaveBeenCalledWith({
        where: { branchId_productId: { branchId: 1, productId: 'p1' } },
        data: { qty: { decrement: 2 } },
      });
    });

    it('never lets stock go negative', async () => {
      prisma.branchInventory.findUnique.mockResolvedValue({ branchId: 1, productId: 'p1', qty: 1 });

      await expect(service.decrementForSale(prisma as never, 1, 'p1', 2)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.branchInventory.update).not.toHaveBeenCalled();
    });
  });
});
