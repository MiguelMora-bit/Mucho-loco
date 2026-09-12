/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: { expense: { findMany: jest.Mock; create: jest.Mock } };

  beforeEach(async () => {
    prisma = { expense: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() } };
    const module = await Test.createTestingModule({
      providers: [ExpensesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ExpensesService);
  });

  it('returns the date as a plain day, not an instant', async () => {
    prisma.expense.findMany.mockResolvedValue([
      {
        id: 'exp-1',
        branchId: 1,
        category: 'rent',
        description: 'Renta local Roma Sur',
        amount: 45000,
        date: new Date('2026-08-01T00:00:00.000Z'),
      },
    ]);

    const [expense] = await service.getAll();

    expect(expense.date).toBe('2026-08-01');
  });

  it('lists newest first', async () => {
    await service.getAll();

    expect(prisma.expense.findMany).toHaveBeenCalledWith({ orderBy: { date: 'desc' } });
  });

  // branchId null es una elección explícita del dueño ("esto es de toda la
  // cadena"), no un campo sin llenar.
  it('stores a corporate expense with no branch', async () => {
    prisma.expense.create.mockImplementation(({ data }: never) => ({
      ...(data as object),
      id: 'exp-new',
    }));

    const expense = await service.create({
      branchId: null,
      category: 'marketing',
      description: 'Campaña nacional',
      amount: 22000,
    });

    expect(expense.branchId).toBeNull();
  });
});
