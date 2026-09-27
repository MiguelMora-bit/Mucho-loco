import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AttendanceEntry } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type { AttendanceEntry as EntryRow } from '@prisma/client';
import {
  alreadyClockedIn,
  entryAlreadyClosed,
  entryNotFound,
  invalidClockOut,
  noOpenEntry,
} from '../common/error-codes';
import type { IdTokenClaims } from '../auth/cognito';
import { clockOutProblem } from './clock-out-rule';

function toEntry(row: EntryRow): AttendanceEntry {
  return {
    id: row.id,
    branchId: row.branchId,
    staffEmail: row.staffEmail,
    staffName: row.staffName,
    clockIn: row.clockIn.toISOString(),
    clockOut: row.clockOut?.toISOString() ?? null,
    correctedBy: row.correctedBy,
  };
}

/**
 * "Hoy" en la zona horaria del servidor, que es lo que quiere un gerente
 * mirando a su equipo en CDMX — no el día UTC, que a partir de las 18:00
 * locales ya sería mañana. El contenedor tiene que correr con
 * TZ=America/Mexico_City para que esto signifique lo que parece.
 */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  /** El turno abierto del empleado, si tiene uno. A lo más hay uno (índice único parcial). */
  async getOpenEntry(staffEmail: string): Promise<AttendanceEntry | null> {
    const row = await this.prisma.attendanceEntry.findFirst({
      where: { staffEmail, clockOut: null },
    });
    return row ? toEntry(row) : null;
  }

  /**
   * Ficha entrada. Se liga al `Employee` con ese correo cuando existe — ese
   * vínculo es lo que hace que la nómina cuente este turno. Si no existe
   * (alguien fichando antes de estar dado de alta en RRHH), la asistencia se
   * guarda igual: es un hecho que pasó, y perderlo sería peor que no poder
   * pagarlo todavía.
   */
  async clockIn(branchId: number, staffEmail: string, staffName: string): Promise<AttendanceEntry> {
    const open = await this.prisma.attendanceEntry.findFirst({
      where: { staffEmail, clockOut: null },
    });
    if (open) {
      throw new BadRequestException(alreadyClockedIn(staffEmail));
    }

    const employee = await this.prisma.employee.findUnique({ where: { email: staffEmail } });
    const row = await this.prisma.attendanceEntry.create({
      data: { branchId, staffEmail, staffName, employeeId: employee?.id ?? null },
    });
    return toEntry(row);
  }

  async clockOut(staffEmail: string): Promise<AttendanceEntry> {
    const open = await this.prisma.attendanceEntry.findFirst({
      where: { staffEmail, clockOut: null },
    });
    if (!open) {
      throw new NotFoundException(noOpenEntry(staffEmail));
    }

    const row = await this.prisma.attendanceEntry.update({
      where: { id: open.id },
      data: { clockOut: new Date() },
    });
    return toEntry(row);
  }

  /**
   * Turnos sin salida de la sucursal (spec 055): abiertos desde antes de hoy,
   * el más viejo primero. El que olvidó fichar su salida no puede volver a
   * entrar, y ese día no se paga hasta que se cierre. Uno abierto hoy es
   * alguien trabajando, no un olvido.
   */
  async getForgottenEntries(branchId: number): Promise<AttendanceEntry[]> {
    const rows = await this.prisma.attendanceEntry.findMany({
      where: { branchId, clockOut: null, clockIn: { lt: startOfToday() } },
      orderBy: { clockIn: 'asc' },
    });
    return rows.map(toEntry);
  }

  /**
   * El gerente captura la hora real de salida (spec 055). Queda quién y cuándo
   * lo corrigió. Condicional a que siga abierto: si el empleado fichó su salida
   * mientras tanto, gana la suya.
   */
  async closeEntry(
    entryId: string,
    clockOut: Date,
    closer: Pick<IdTokenClaims, 'name'>,
    now: Date = new Date(),
  ): Promise<AttendanceEntry> {
    const entry = await this.prisma.attendanceEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException(entryNotFound(entryId));
    if (entry.clockOut) throw new BadRequestException(entryAlreadyClosed(entryId));

    const problem = clockOutProblem(entry.clockIn, clockOut, now);
    if (problem) throw new BadRequestException(invalidClockOut(entryId, problem));

    const { count } = await this.prisma.attendanceEntry.updateMany({
      where: { id: entryId, clockOut: null },
      data: { clockOut, correctedBy: closer.name, correctedAt: now },
    });
    if (count === 0) throw new BadRequestException(entryAlreadyClosed(entryId));
    return toEntry(await this.prisma.attendanceEntry.findUniqueOrThrow({ where: { id: entryId } }));
  }

  /** Vista de gerente: quién de la sucursal fichó hoy, más reciente primero. */
  async getTeamToday(branchId: number): Promise<AttendanceEntry[]> {
    const rows = await this.prisma.attendanceEntry.findMany({
      where: { branchId, clockIn: { gte: startOfToday() } },
      orderBy: { clockIn: 'desc' },
    });
    return rows.map(toEntry);
  }
}
