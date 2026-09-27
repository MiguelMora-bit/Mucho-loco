/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExpensesService, expenseDay } from './expenses.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: {
    expense: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; deleteMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      expense: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(({ where, data }: { where: { id: string }; data: object }) => ({
          id: where.id,
          date: new Date('2026-09-02T00:00:00.000Z'),
          ...data,
        })),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
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

  // Spec 054: el gasto es de un día de CDMX, real y no futuro.
  describe('expenseDay', () => {
    // 27 de septiembre, 02:00 UTC = 26 de septiembre, 20:00 en CDMX.
    const now = new Date('2026-09-27T02:00:00.000Z');

    it('defaults to today in CDMX, not the UTC day', () => {
      expect(expenseDay(undefined, now)).toBe('2026-09-26');
    });

    it('keeps a past day and today', () => {
      expect(expenseDay('2026-09-01', now)).toBe('2026-09-01');
      expect(expenseDay('2026-09-26', now)).toBe('2026-09-26');
    });

    it('refuses the future and days that do not exist', () => {
      for (const date of ['2026-09-27', '2026-02-30', '2026-13-01']) {
        expect(() => expenseDay(date, now)).toThrow(BadRequestException);
      }
    });
  });

  describe('update', () => {
    const dto = { branchId: 1, category: 'rent' as const, description: 'Renta', amount: 1200 };

    it('replaces what was captured and keeps the day when none is sent', async () => {
      prisma.expense.findUnique.mockResolvedValue({ id: 'exp-1' });

      const expense = await service.update('exp-1', dto);

      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: { branchId: 1, category: 'rent', description: 'Renta', amount: 1200 },
      });
      expect(expense.date).toBe('2026-09-02');
    });

    it('moves the expense to the day it happened', async () => {
      prisma.expense.findUnique.mockResolvedValue({ id: 'exp-1' });

      await service.update('exp-1', { ...dto, date: '2026-09-03' });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ date: new Date('2026-09-03T00:00:00.000Z') }) }),
      );
    });

    it('answers EXPENSE_NOT_FOUND for one that no longer exists', async () => {
      prisma.expense.findUnique.mockResolvedValue(null);

      await expect(service.update('nope', dto)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.expense.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes it', async () => {
      await service.remove('exp-1');

      expect(prisma.expense.deleteMany).toHaveBeenCalledWith({ where: { id: 'exp-1' } });
    });

    it('answers EXPENSE_NOT_FOUND when there was nothing to delete', async () => {
      prisma.expense.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove('nope')).rejects.toMatchObject({ response: { code: 'EXPENSE_NOT_FOUND' } });
    });
  });
});
