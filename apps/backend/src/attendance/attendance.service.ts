import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AttendanceEntry } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type { AttendanceEntry as EntryRow } from '@prisma/client';

function toEntry(row: EntryRow): AttendanceEntry {
  return {
    id: row.id,
    branchId: row.branchId,
    staffEmail: row.staffEmail,
    staffName: row.staffName,
    clockIn: row.clockIn.toISOString(),
    clockOut: row.clockOut?.toISOString() ?? null,
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
      throw new BadRequestException(`${staffEmail} ya tiene un turno abierto`);
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
      throw new NotFoundException(`${staffEmail} no tiene un turno abierto`);
    }

    const row = await this.prisma.attendanceEntry.update({
      where: { id: open.id },
      data: { clockOut: new Date() },
    });
    return toEntry(row);
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
