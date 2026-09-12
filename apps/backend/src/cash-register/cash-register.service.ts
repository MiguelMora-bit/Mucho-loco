import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CashRegisterShift, PaymentMethod, ShiftTransaction } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type { CashRegisterShift as ShiftRow } from '@prisma/client';

function toShift(row: ShiftRow): CashRegisterShift {
  return {
    id: row.id,
    branchId: row.branchId,
    openedAt: row.openedAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    status: row.status,
  };
}

@Injectable()
export class CashRegisterService {
  constructor(private prisma: PrismaService) {}

  /**
   * El turno abierto de la sucursal; si no hay ninguno, lo abre.
   *
   * No hay un "abrir turno" explícito a propósito: mostrador entra a la
   * pantalla de caja y ya está trabajando. El índice único parcial
   * (`cash_register_shifts_one_open_per_branch`, ver la migración) impide que
   * dos cajeros entrando a la vez creen dos turnos abiertos — si la carrera
   * ocurre, el segundo insert falla y se lee el que ganó.
   */
  async getOpenShift(branchId: number): Promise<CashRegisterShift> {
    const existing = await this.prisma.cashRegisterShift.findFirst({
      where: { branchId, status: 'open' },
    });
    if (existing) return toShift(existing);

    try {
      const created = await this.prisma.cashRegisterShift.create({
        data: { branchId, status: 'open' },
      });
      return toShift(created);
    } catch {
      const winner = await this.prisma.cashRegisterShift.findFirst({
        where: { branchId, status: 'open' },
      });
      if (!winner) throw new NotFoundException(`No se pudo abrir turno en la sucursal ${branchId}`);
      return toShift(winner);
    }
  }

  /**
   * Todo lo que entró a la caja durante el turno, en un solo timeline:
   * ventas de mostrador y cobros de membresía juntos, ordenados del más
   * reciente al más viejo.
   *
   * Un turno abierto se cuenta hasta AHORA; uno cerrado, hasta su cierre.
   */
  async getTransactions(shiftId: string): Promise<ShiftTransaction[]> {
    const shift = await this.prisma.cashRegisterShift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException(`Shift not found: ${shiftId}`);

    const window = { gte: shift.openedAt, lte: shift.closedAt ?? new Date() };

    const [sales, payments] = await Promise.all([
      this.prisma.counterSale.findMany({
        where: { branchId: shift.branchId, createdAt: window },
        include: { items: true },
      }),
      this.prisma.membershipPayment.findMany({
        where: { branchId: shift.branchId, createdAt: window },
      }),
    ]);

    const transactions: ShiftTransaction[] = [
      ...sales.map((sale) => ({
        id: sale.id,
        kind: 'sale' as const,
        description: sale.items.map((i) => `${i.qty}x ${i.productName}`).join(', '),
        amount: sale.total,
        paymentMethod: sale.paymentMethod as PaymentMethod,
        createdAt: sale.createdAt.toISOString(),
      })),
      ...payments.map((payment) => ({
        id: payment.id,
        kind: 'membership' as const,
        description: `${payment.isNewMember ? 'Alta' : 'Renovación'} — ${payment.memberName}`,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod as PaymentMethod,
        createdAt: payment.createdAt.toISOString(),
      })),
    ];

    return transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Historial auditable: solo turnos cerrados, del cierre más reciente al más viejo. */
  async getHistory(branchId: number): Promise<CashRegisterShift[]> {
    const rows = await this.prisma.cashRegisterShift.findMany({
      where: { branchId, status: 'closed' },
      orderBy: { closedAt: 'desc' },
    });
    return rows.map(toShift);
  }

  /**
   * Cerrar es final: no se reabre. El siguiente turno nace solo, la próxima
   * vez que alguien pida el abierto — así el corte queda congelado y nadie le
   * mete una venta después de cuadrar el cajón.
   */
  async closeShift(shiftId: string): Promise<CashRegisterShift> {
    const shift = await this.prisma.cashRegisterShift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException(`Shift not found: ${shiftId}`);
    if (shift.status === 'closed') {
      throw new BadRequestException(`Shift already closed: ${shiftId}`);
    }

    const closed = await this.prisma.cashRegisterShift.update({
      where: { id: shiftId },
      data: { status: 'closed', closedAt: new Date() },
    });
    return toShift(closed);
  }
}
