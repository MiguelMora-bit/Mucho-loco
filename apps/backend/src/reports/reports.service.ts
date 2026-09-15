import { Injectable } from '@nestjs/common';
import type {
  BranchSalesReport,
  BranchStatsSummary,
  DailySales,
  TopProduct,
} from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';

/** Cuántos días mira el panel del dueño cuando nadie le dice otra cosa. */
export const DEFAULT_STATS_WINDOW_DAYS = 30;
/** Cuántos productos lista el "más vendidos" — mismo tope que tenía el mock. */
const TOP_PRODUCTS_LIMIT = 5;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

const dateKey = (d: Date): string => d.toISOString().slice(0, 10);

/** Los reportes hablan en pesos, como el resto del contrato; el registro de cobros guarda centavos. */
const toPesos = (cents: number): number => cents / 100;

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Reporte del gerente de UNA sucursal: cuánto entró, en qué días y qué se
   * vendió más.
   *
   * "Lo que entró" sale del registro de cobros (`Charge`): todo cobro ligado a
   * esa sucursal, del canal que sea — ventas y membresías de mostrador,
   * pedidos de recoger (en efectivo al entregarlos, en línea al pagarlos) y
   * membresías contratadas en línea con esa sucursal de inscripción. Antes se
   * sumaban tres tablas a mano y lo cobrado en línea no aparecía. Un envío a
   * domicilio NO cuenta: sale de la bodega central y no toca la sucursal (ver
   * CLAUDE.md raíz, "Inventario por sucursal").
   *
   * Gemelo de `calculateSalesReport` en branch-app/lib/reports.ts, que hacía
   * esta misma cuenta en el navegador sobre arreglos mock. La diferencia no es
   * solo dónde corre: allá el cliente tenía que traerse TODAS las ventas para
   * poder sumar las suyas.
   */
  async getSalesReport(branchId: number, days: number): Promise<BranchSalesReport> {
    const since = daysAgo(days);

    const [charges, sales] = await Promise.all([
      this.prisma.charge.findMany({
        where: { branchId, paidAt: { gte: since } },
        select: { totalCents: true, paidAt: true },
      }),
      // Solo para el ranking de productos (ver abajo).
      this.prisma.counterSale.findMany({
        where: { branchId, createdAt: { gte: since } },
        include: { items: true },
      }),
    ]);

    // Se suma en centavos y se convierte al final: una renovación de Stripe
    // puede traer centavos, y sumar pesos con decimales acumula error.
    // Sin relleno de ceros: un día sin movimiento simplemente no aparece,
    // mismo comportamiento que ya tenía el reporte del mock.
    const centsByDay = new Map<string, number>();
    for (const charge of charges) {
      const key = dateKey(charge.paidAt);
      centsByDay.set(key, (centsByDay.get(key) ?? 0) + charge.totalCents);
    }

    const byDay: DailySales[] = [...centsByDay.entries()]
      .map(([date, cents]) => ({ date, revenue: toPesos(cents) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Solo ventas de mostrador: una membresía no es un producto, y un pedido
    // en línea ya descontó de la bodega central, no del stock de aquí.
    const productMap = new Map<string, TopProduct>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productMap.get(item.productId);
        const revenue = item.qty * item.unitPrice;
        if (existing) {
          existing.qtySold += item.qty;
          existing.revenue += revenue;
        } else {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            qtySold: item.qty,
            revenue,
          });
        }
      }
    }
    const topProducts = [...productMap.values()]
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, TOP_PRODUCTS_LIMIT);

    return {
      branchId,
      days,
      totalRevenue: toPesos(charges.reduce((sum, c) => sum + c.totalCents, 0)),
      transactionCount: charges.length,
      byDay,
      topProducts,
    };
  }

  /**
   * Resumen del dueño: las 15 sucursales, cada una con su ingreso de la
   * ventana y cuántos socios activos tiene.
   *
   * El mock devolvía cuatro filas escritas a mano (`BRANCH_STATS`, con
   * revenue: 186400 fijo). Aquí sale del registro de cobros, así que al
   * principio los números son chicos — es el precio de que sean ciertos.
   *
   * `activeCustomers` cuenta membresías vigentes, incluidas las que están en
   * periodo de gracia: un socio con un pago fallido sigue entrando al gimnasio
   * (ver CLAUDE.md raíz), así que sigue siendo un cliente activo.
   */
  async getBranchStats(days = DEFAULT_STATS_WINDOW_DAYS): Promise<BranchStatsSummary[]> {
    const since = daysAgo(days);

    const [branches, revenueByBranch, membersByBranch] = await Promise.all([
      this.prisma.branch.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.charge.groupBy({
        by: ['branchId'],
        where: { paidAt: { gte: since } },
        _sum: { totalCents: true },
      }),
      this.prisma.membership.groupBy({
        by: ['branchId'],
        where: { status: { in: ['active', 'grace'] } },
        _count: { _all: true },
      }),
    ]);

    return branches.map((branch) => ({
      branchId: branch.id,
      branchName: branch.name,
      revenue: toPesos(
        revenueByBranch.find((r) => r.branchId === branch.id)?._sum.totalCents ?? 0,
      ),
      activeCustomers:
        membersByBranch.find((m) => m.branchId === branch.id)?._count._all ?? 0,
    }));
  }
}
