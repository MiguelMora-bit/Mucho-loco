/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PrismaService } from '../prisma/prisma.service';
import { calculateISR, calculateIMSS, calculatePayroll } from './payroll.math';

const at = (iso: string) => new Date(`${iso}T14:00:00.000Z`);

const period = {
  id: 'period-2',
  startDate: new Date('2026-08-16T00:00:00.000Z'),
  endDate: new Date('2026-08-31T00:00:00.000Z'),
  totalDays: 16,
  status: 'open',
};

// Mismos números que owner-panel/src/lib/payroll.ts calcula hoy en el
// navegador. Si las dos implementaciones se separan, el recibo cambiaría solo
// por dónde se calculó — que es exactamente lo que no puede pasar.
describe('payroll math', () => {
  it('withholds nothing below the first bracket', () => {
    expect(calculateISR(1000)).toBe(0);
  });

  it('applies each bracket only to the part of the pay inside it', () => {
    // 1500@0% + 1500@5% = 75
    expect(calculateISR(3000)).toBe(75);
    // ...+ 3000@10% = 375
    expect(calculateISR(6000)).toBe(375);
    // ...+ 6000@15% = 1275
    expect(calculateISR(12000)).toBe(1275);
    // ...+ 1000@20% = 1475
    expect(calculateISR(13000)).toBe(1475);
  });

  it('takes IMSS as a flat rate, rounded', () => {
    expect(calculateIMSS(10500)).toBe(263);
  });

  it('nets out both deductions from gross pay', () => {
    expect(calculatePayroll(700, 15)).toEqual({
      grossPay: 10500,
      isrDeduction: 1050,
      imssDeduction: 263,
      netPay: 9187,
    });
  });
});

describe('PayrollService', () => {
  let service: PayrollService;
  let prisma: {
    employee: { findMany: jest.Mock };
    payrollPeriod: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    payslip: { findMany: jest.Mock; createMany: jest.Mock };
    attendanceEntry: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      employee: { findMany: jest.fn().mockResolvedValue([]) },
      payrollPeriod: {
        findMany: jest.fn().mockResolvedValue([period]),
        findUnique: jest.fn().mockResolvedValue(period),
        update: jest.fn(),
      },
      payslip: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn() },
      attendanceEntry: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    const module = await Test.createTestingModule({
      providers: [PayrollService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PayrollService);
  });

  describe('getAttendanceSummaries', () => {
    // El punto de todo esto: daysWorked deja de ser un dato semilla y pasa a
    // ser lo que branch-app fichó de verdad.
    it('counts real clocked shifts, one day at a time', async () => {
      prisma.attendanceEntry.findMany.mockResolvedValue([
        { employeeId: 'emp-1', clockIn: at('2026-08-17') },
        { employeeId: 'emp-1', clockIn: at('2026-08-18') },
        { employeeId: 'emp-2', clockIn: at('2026-08-18') },
      ]);

      const summaries = await service.getAttendanceSummaries();

      expect(summaries).toEqual([
        { employeeId: 'emp-1', periodId: 'period-2', daysWorked: 2 },
        { employeeId: 'emp-2', periodId: 'period-2', daysWorked: 1 },
      ]);
    });

    // Entrar y salir dos veces el mismo día es un día trabajado, no dos.
    it('counts distinct days, not shifts', async () => {
      prisma.attendanceEntry.findMany.mockResolvedValue([
        { employeeId: 'emp-1', clockIn: new Date('2026-08-17T09:00:00.000Z') },
        { employeeId: 'emp-1', clockIn: new Date('2026-08-17T17:00:00.000Z') },
      ]);

      const [summary] = await service.getAttendanceSummaries();

      expect(summary.daysWorked).toBe(1);
    });

    it('ignores shifts outside the period window', async () => {
      prisma.attendanceEntry.findMany.mockResolvedValue([
        { employeeId: 'emp-1', clockIn: at('2026-08-15') },
        { employeeId: 'emp-1', clockIn: at('2026-09-01') },
      ]);

      expect(await service.getAttendanceSummaries()).toEqual([]);
    });

    // El último día del periodo cuenta completo, no hasta su medianoche.
    it('includes a shift late on the last day of the period', async () => {
      prisma.attendanceEntry.findMany.mockResolvedValue([
        { employeeId: 'emp-1', clockIn: new Date('2026-08-31T22:00:00.000Z') },
      ]);

      expect((await service.getAttendanceSummaries())[0].daysWorked).toBe(1);
    });

    // Sin hora de salida no hay jornada, y sin empleado ligado no hay a quién
    // pagarle — los dos filtros van en la consulta.
    it('only looks at closed shifts belonging to a real employee', async () => {
      await service.getAttendanceSummaries();

      expect(prisma.attendanceEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clockOut: { not: null }, employeeId: { not: null } },
        }),
      );
    });
  });

  describe('runPayroll', () => {
    beforeEach(() => {
      prisma.attendanceEntry.findMany.mockResolvedValue([
        { employeeId: 'emp-1', clockIn: at('2026-08-17') },
        { employeeId: 'emp-1', clockIn: at('2026-08-18') },
      ]);
      prisma.employee.findMany.mockResolvedValue([
        { id: 'emp-1', name: 'Ana Sofía Martínez', branchId: 1, role: 'manager', dailyRate: 850, active: true },
      ]);
    });

    it('pays for the days actually clocked and closes the period', async () => {
      await service.runPayroll('period-2');

      const [{ data }] = prisma.payslip.createMany.mock.calls[0] as [{ data: Record<string, unknown>[] }];
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        employeeId: 'emp-1',
        daysWorked: 2,
        totalDays: 16,
        dailyRate: 850,
        grossPay: 1700,
      });
      expect(prisma.payrollPeriod.update).toHaveBeenCalledWith({
        where: { id: 'period-2' },
        data: { status: 'closed' },
      });
    });

    // Un recibo es un documento histórico: tiene que seguir diciendo lo mismo
    // aunque el empleado cambie de sucursal, de puesto o de sueldo.
    it('freezes name, branch, role and rate onto the payslip', async () => {
      await service.runPayroll('period-2');

      const [{ data }] = prisma.payslip.createMany.mock.calls[0] as [{ data: Record<string, unknown>[] }];
      expect(data[0]).toMatchObject({
        employeeName: 'Ana Sofía Martínez',
        branchId: 1,
        role: 'manager',
        dailyRate: 850,
      });
    });

    it('skips employees who are no longer active', async () => {
      prisma.employee.findMany.mockResolvedValue([]);

      await service.runPayroll('period-2');

      const [{ data }] = prisma.payslip.createMany.mock.calls[0] as [{ data: unknown[] }];
      expect(data).toEqual([]);
    });

    // Cerrar es final: corregir una asistencia después no puede recalcular un
    // recibo ya pagado.
    it('refuses to run a period that is already closed', async () => {
      prisma.payrollPeriod.findUnique.mockResolvedValue({ ...period, status: 'closed' });

      await expect(service.runPayroll('period-2')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.payslip.createMany).not.toHaveBeenCalled();
    });

    it('rejects an unknown period', async () => {
      prisma.payrollPeriod.findUnique.mockResolvedValue(null);

      await expect(service.runPayroll('nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('writes the payslips and closes the period in one transaction', async () => {
      await service.runPayroll('period-2');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
