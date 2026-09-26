import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AttendanceSummary,
  Employee,
  EmployeeRole,
  PayrollPeriod,
  Payslip,
} from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type {
  Employee as EmployeeRow,
  PayrollPeriod as PeriodRow,
  Payslip as PayslipRow,
} from '@prisma/client';
import { calculatePayroll } from './payroll.math';
import { nextPeriodRange, periodContaining, type PeriodRange } from './payroll-periods';
import { dayDate, mexicoDay } from '../memberships/visit-stats';
import { periodAlreadyClosed, periodAlreadyOpen, periodNotFound } from '../common/error-codes';

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

const periodRow = (range: PeriodRange) => ({
  startDate: dayDate(range.startDate),
  endDate: dayDate(range.endDate),
  totalDays: range.totalDays,
});

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    branchId: row.branchId,
    name: row.name,
    email: row.email,
    role: row.role as EmployeeRole,
    dailyRate: row.dailyRate,
    hireDate: isoDate(row.hireDate),
    active: row.active,
  };
}

function toPeriod(row: PeriodRow): PayrollPeriod {
  return {
    id: row.id,
    startDate: isoDate(row.startDate),
    endDate: isoDate(row.endDate),
    totalDays: row.totalDays,
    status: row.status,
  };
}

function toPayslip(row: PayslipRow): Payslip {
  return {
    id: row.id,
    periodId: row.periodId,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    branchId: row.branchId,
    role: row.role as EmployeeRole,
    daysWorked: row.daysWorked,
    totalDays: row.totalDays,
    dailyRate: row.dailyRate,
    grossPay: row.grossPay,
    isrDeduction: row.isrDeduction,
    imssDeduction: row.imssDeduction,
    netPay: row.netPay,
    generatedAt: row.generatedAt.toISOString(),
  };
}

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  async getEmployees(): Promise<Employee[]> {
    const rows = await this.prisma.employee.findMany({ orderBy: [{ branchId: 'asc' }, { name: 'asc' }] });
    return rows.map(toEmployee);
  }

  async getPeriods(): Promise<PayrollPeriod[]> {
    const rows = await this.prisma.payrollPeriod.findMany({ orderBy: { startDate: 'asc' } });
    return rows.map(toPeriod);
  }

  async getPayslips(): Promise<Payslip[]> {
    const rows = await this.prisma.payslip.findMany({ orderBy: { generatedAt: 'desc' } });
    return rows.map(toPayslip);
  }

  /**
   * AQUÍ se cierra el hueco de la Fase 3: `daysWorked` ya no es un dato
   * pre-cargado (`ATTENDANCE_SUMMARIES` del mock de owner-panel), sino la
   * cuenta de los turnos que branch-app fichó de verdad.
   *
   * Se cuentan DÍAS DISTINTOS con turno cerrado, no turnos: alguien que
   * entra y sale dos veces el mismo día trabajó un día, no dos. Un turno
   * todavía abierto no cuenta — sin hora de salida no hay jornada completa.
   *
   * El día de un turno es el de CDMX en que empezó (spec 051), como el
   * `visitDay` de un socio. Con la fecha UTC, un turno después de las 18:00
   * contaba como del día siguiente y el 15 o el fin de mes caía en la otra
   * quincena.
   */
  async getAttendanceSummaries(): Promise<AttendanceSummary[]> {
    const [periods, entries] = await Promise.all([
      this.prisma.payrollPeriod.findMany({ orderBy: { startDate: 'asc' } }),
      this.prisma.attendanceEntry.findMany({
        where: { clockOut: { not: null }, employeeId: { not: null } },
        select: { employeeId: true, clockIn: true },
      }),
    ]);

    const summaries: AttendanceSummary[] = [];
    const shifts = entries.map((entry) => ({ employeeId: entry.employeeId as string, day: mexicoDay(entry.clockIn) }));
    for (const period of periods) {
      const start = isoDate(period.startDate);
      const end = isoDate(period.endDate);
      const daysByEmployee = new Map<string, Set<string>>();
      for (const { employeeId, day } of shifts) {
        if (day < start || day > end) continue;
        const days = daysByEmployee.get(employeeId) ?? new Set<string>();
        days.add(day);
        daysByEmployee.set(employeeId, days);
      }
      for (const [employeeId, days] of daysByEmployee) {
        summaries.push({ employeeId, periodId: period.id, daysWorked: days.size });
      }
    }
    return summaries;
  }

  /**
   * "Abrir siguiente quincena" (spec 050): para destrabar una nómina que se
   * quedó sin quincena abierta. La operación normal no la necesita — correr
   * la nómina ya abre la siguiente. Sin ninguna quincena, la de hoy en CDMX.
   */
  async openNextPeriod(now: Date = new Date()): Promise<PayrollPeriod> {
    const open = await this.prisma.payrollPeriod.findFirst({ where: { status: 'open' } });
    if (open) throw new ConflictException(periodAlreadyOpen(open.id));

    const latest = await this.prisma.payrollPeriod.findFirst({ orderBy: { endDate: 'desc' } });
    const range = latest ? nextPeriodRange(isoDate(latest.endDate)) : periodContaining(mexicoDay(now));
    try {
      return toPeriod(await this.prisma.payrollPeriod.create({ data: periodRow(range) }));
    } catch (error) {
      // Dos clics simultáneos calculan la misma quincena; el índice único deja
      // pasar uno y el otro ve la que ya se abrió.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.prisma.payrollPeriod.findUnique({ where: { startDate: dayDate(range.startDate) } });
        throw new ConflictException(periodAlreadyOpen(winner?.id ?? range.startDate));
      }
      throw error;
    }
  }

  /**
   * Emite los recibos del periodo y lo cierra. Cerrar es final: un recibo
   * pagado no se recalcula porque alguien haya corregido una asistencia
   * después.
   *
   * En la misma transacción abre la quincena siguiente (spec 050), salvo que
   * ya exista una posterior — así siempre queda una abierta y la nómina nunca
   * se detiene esperando a que alguien la capture.
   *
   * Solo entran empleados activos CON días trabajados — a diferencia del mock,
   * que recorría un `ATTENDANCE_SUMMARIES` semilla y hacía `EMPLOYEES.find(...)!`
   * confiando en que el empleado existiera.
   */
  async runPayroll(periodId: string): Promise<Payslip[]> {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException(periodNotFound(periodId));
    if (period.status === 'closed') {
      throw new BadRequestException(periodAlreadyClosed(periodId));
    }

    const summaries = (await this.getAttendanceSummaries()).filter((s) => s.periodId === periodId);
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: summaries.map((s) => s.employeeId) }, active: true },
    });
    const employeeById = new Map(employees.map((e) => [e.id, e]));

    const rows = summaries
      .filter((summary) => employeeById.has(summary.employeeId))
      .map((summary) => {
        const employee = employeeById.get(summary.employeeId) as EmployeeRow;
        const calc = calculatePayroll(employee.dailyRate, summary.daysWorked);
        return {
          periodId,
          employeeId: employee.id,
          // Congelados: el recibo tiene que seguir diciendo lo mismo aunque el
          // empleado cambie de sucursal, puesto o sueldo después.
          employeeName: employee.name,
          branchId: employee.branchId,
          role: employee.role,
          daysWorked: summary.daysWorked,
          totalDays: period.totalDays,
          dailyRate: employee.dailyRate,
          ...calc,
        };
      });

    return this.prisma.$transaction(async (tx) => {
      await tx.payslip.createMany({ data: rows });
      await tx.payrollPeriod.update({ where: { id: periodId }, data: { status: 'closed' } });
      const later = await tx.payrollPeriod.findFirst({ where: { startDate: { gt: period.endDate } } });
      if (!later) {
        await tx.payrollPeriod.createMany({
          data: [periodRow(nextPeriodRange(isoDate(period.endDate)))],
          skipDuplicates: true,
        });
      }
      const created = await tx.payslip.findMany({ where: { periodId } });
      return created.map(toPayslip);
    });
  }
}
