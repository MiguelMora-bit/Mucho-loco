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
  ...overrides,
});

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: {
    attendanceEntry: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
    employee: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      attendanceEntry: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
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
});
