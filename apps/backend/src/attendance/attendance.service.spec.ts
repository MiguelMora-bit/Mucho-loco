/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';

const entryRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'a1',
  branchId: 1,
  staffEmail: 'luis@mucholoco.mx',
  staffName: 'Luis Ángel Ortega',
  clockIn: new Date('2026-09-12T14:00:00.000Z'),
  clockOut: null,
  correctedBy: null,
  ...overrides,
});

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: {
    attendanceEntry: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    employee: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      attendanceEntry: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      employee: { findUnique: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [AttendanceService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AttendanceService);
  });

  // El vínculo con Employee es lo que hace que la nómina cuente este turno —
  // sin él, la asistencia existe pero no se paga.
  it('links the entry to the employee with that email', async () => {
    prisma.attendanceEntry.findFirst.mockResolvedValue(null);
    prisma.employee.findUnique.mockResolvedValue({ id: 'emp-2' });
    prisma.attendanceEntry.create.mockResolvedValue(entryRow());

    await service.clockIn(1, 'luis@mucholoco.mx', 'Luis Ángel Ortega');

    expect(prisma.attendanceEntry.create).toHaveBeenCalledWith({
      data: {
        branchId: 1,
        staffEmail: 'luis@mucholoco.mx',
        staffName: 'Luis Ángel Ortega',
        employeeId: 'emp-2',
      },
    });
  });

  // Fichar es un hecho que pasó: perderlo porque RRHH no ha dado de alta a la
  // persona sería peor que no poder pagárselo todavía.
  it('still records attendance for someone who is not an employee yet', async () => {
    prisma.attendanceEntry.findFirst.mockResolvedValue(null);
    prisma.employee.findUnique.mockResolvedValue(null);
    prisma.attendanceEntry.create.mockResolvedValue(entryRow());

    await service.clockIn(1, 'nuevo@mucholoco.mx', 'Nuevo');

    expect(prisma.attendanceEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ employeeId: null }) }),
    );
  });

  it('refuses a second clock-in while a shift is still open', async () => {
    prisma.attendanceEntry.findFirst.mockResolvedValue(entryRow());

    await expect(service.clockIn(1, 'luis@mucholoco.mx', 'Luis')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.attendanceEntry.create).not.toHaveBeenCalled();
  });

  it('clocking out stamps the exit on the open entry', async () => {
    prisma.attendanceEntry.findFirst.mockResolvedValue(entryRow());
    prisma.attendanceEntry.update.mockResolvedValue(entryRow({ clockOut: new Date() }));

    const closed = await service.clockOut('luis@mucholoco.mx');

    expect(closed.clockOut).not.toBeNull();
    expect(prisma.attendanceEntry.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { clockOut: expect.any(Date) },
    });
  });

  it('refuses to clock out with no open shift', async () => {
    prisma.attendanceEntry.findFirst.mockResolvedValue(null);

    await expect(service.clockOut('luis@mucholoco.mx')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('the team view only covers today, newest first', async () => {
    prisma.attendanceEntry.findMany.mockResolvedValue([]);

    await service.getTeamToday(1);

    const args = prisma.attendanceEntry.findMany.mock.calls[0][0] as {
      where: { branchId: number; clockIn: { gte: Date } };
      orderBy: unknown;
    };
    expect(args.where.branchId).toBe(1);
    expect(args.where.clockIn.gte.getHours()).toBe(0);
    expect(args.orderBy).toEqual({ clockIn: 'desc' });
  });

  // Spec 055: el gerente cierra el turno que alguien olvidó.
  describe('closeEntry', () => {
    const NOW = new Date('2026-09-13T15:00:00.000Z');
    const manager = { name: 'Ana Sofía Martínez' };
    const clockOut = new Date('2026-09-12T22:00:00.000Z');

    it('closes it with the real time and records who corrected it', async () => {
      prisma.attendanceEntry.findUnique.mockResolvedValue(entryRow());
      prisma.attendanceEntry.findUniqueOrThrow.mockResolvedValue(
        entryRow({ clockOut, correctedBy: manager.name }),
      );

      const closed = await service.closeEntry('a1', clockOut, manager, NOW);

      expect(prisma.attendanceEntry.updateMany).toHaveBeenCalledWith({
        where: { id: 'a1', clockOut: null },
        data: { clockOut, correctedBy: 'Ana Sofía Martínez', correctedAt: NOW },
      });
      expect(closed).toMatchObject({ clockOut: clockOut.toISOString(), correctedBy: 'Ana Sofía Martínez' });
    });

    it('refuses a time the rule rejects, and leaves it open', async () => {
      prisma.attendanceEntry.findUnique.mockResolvedValue(entryRow());

      await expect(
        service.closeEntry('a1', new Date('2026-09-12T13:00:00.000Z'), manager, NOW),
      ).rejects.toMatchObject({ response: { code: 'INVALID_CLOCK_OUT', reason: 'before_clock_in' } });
      expect(prisma.attendanceEntry.updateMany).not.toHaveBeenCalled();
    });

    it('does not overwrite a clock-out the employee made meanwhile', async () => {
      prisma.attendanceEntry.findUnique.mockResolvedValue(entryRow());
      prisma.attendanceEntry.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.closeEntry('a1', clockOut, manager, NOW)).rejects.toMatchObject({
        response: { code: 'ENTRY_ALREADY_CLOSED' },
      });
    });

    it('answers ENTRY_ALREADY_CLOSED and ENTRY_NOT_FOUND', async () => {
      prisma.attendanceEntry.findUnique.mockResolvedValue(entryRow({ clockOut }));
      await expect(service.closeEntry('a1', clockOut, manager, NOW)).rejects.toBeInstanceOf(BadRequestException);

      prisma.attendanceEntry.findUnique.mockResolvedValue(null);
      await expect(service.closeEntry('nope', clockOut, manager, NOW)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // Uno abierto hoy es alguien trabajando, no un olvido.
  it('getForgottenEntries lists the branch shifts left open before today, oldest first', async () => {
    prisma.attendanceEntry.findMany.mockResolvedValue([entryRow()]);

    await service.getForgottenEntries(1);

    const [args] = prisma.attendanceEntry.findMany.mock.calls[0] as [
      { where: { branchId: number; clockOut: null; clockIn: { lt: Date } }; orderBy: unknown },
    ];
    expect(args.where).toMatchObject({ branchId: 1, clockOut: null });
    expect(args.where.clockIn.lt.getHours()).toBe(0);
    expect(args.orderBy).toEqual({ clockIn: 'asc' });
  });
});
