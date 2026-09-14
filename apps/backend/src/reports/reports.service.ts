import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Reporte del gerente de UNA sucursal: cuánto entró, en qué días y qué se
   * vendió más.
   *
   * "Lo que entró" son las tres cosas que pasan por esa sucursal: ventas de
   * mostrador, cobros de membresía y pedidos recogidos. Un envío a domicilio
   * NO cuenta: sale de la bodega central y no toca la sucursal (ver CLAUDE.md
   * raíz, "Inventario por sucursal").
   *
   * Gemelo de `calculateSalesReport` en branch-app/lib/reports.ts, que hacía
   * esta misma cuenta en el navegador sobre arreglos mock. La diferencia no es
   * solo dónde corre: allá el cliente tenía que traerse TODAS las ventas para
   * poder sumar las suyas.
   */
  async getSalesReport(branchId: number, days: number): Promise<BranchSalesReport> {
    const since = daysAgo(days);

    const [sales, payments, pickups] = await Promise.all([
      this.prisma.counterSale.findMany({
        where: { branchId, createdAt: { gte: since } },
        include: { items: true },
      }),
      this.prisma.membershipPayment.findMany({
        where: { branchId, createdAt: { gte: since } },
      }),
      this.prisma.order.findMany({
        where: { branchId, delivery: 'pickup', status: 'done', deliveredAt: { gte: since } },
      }),
    ]);

    // Sin relleno de ceros: un día sin movimiento simplemente no aparece,
    // mismo comportamiento que ya tenía el reporte del mock.
    const byDayMap = new Map<string, number>();
    const add = (date: Date, amount: number) => {
      const key = dateKey(date);
      byDayMap.set(key, (byDayMap.get(key) ?? 0) + amount);
    };
    for (const sale of sales) add(sale.createdAt, sale.total);
    for (const payment of payments) add(payment.createdAt, payment.amount);
    for (const order of pickups) add(order.deliveredAt as Date, order.total);

    const byDay: DailySales[] = [...byDayMap.entries()]
      .map(([date, revenue]) => ({ date, revenue }))
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
      totalRevenue: [...byDayMap.values()].reduce((sum, n) => sum + n, 0),
      transactionCount: sales.length + payments.length + pickups.length,
      byDay,
      topProducts,
    };
  }

  /**
   * Resumen del dueño: las 15 sucursales, cada una con su ingreso de la
   * ventana y cuántos socios activos tiene.
   *
   * El mock devolvía cuatro filas escritas a mano (`BRANCH_STATS`, con
   * revenue: 186400 fijo). Aquí sale de las transacciones reales, así que al
   * principio los números son chicos — es el precio de que sean ciertos.
   *
   * `activeCustomers` cuenta membresías vigentes, incluidas las que están en
   * periodo de gracia: un socio con un pago fallido sigue entrando al gimnasio
   * (ver CLAUDE.md raíz), así que sigue siendo un cliente activo.
   */
  async getBranchStats(days = DEFAULT_STATS_WINDOW_DAYS): Promise<BranchStatsSummary[]> {
    const since = daysAgo(days);

    const [branches, salesByBranch, paymentsByBranch, pickupsByBranch, membersByBranch] =
      await Promise.all([
        this.prisma.branch.findMany({ orderBy: { id: 'asc' } }),
        this.prisma.counterSale.groupBy({
          by: ['branchId'],
          where: { createdAt: { gte: since } },
          _sum: { total: true },
        }),
        this.prisma.membershipPayment.groupBy({
          by: ['branchId'],
          where: { createdAt: { gte: since } },
          _sum: { amount: true },
        }),
        this.prisma.order.groupBy({
          by: ['branchId'],
          where: { delivery: 'pickup', status: 'done', deliveredAt: { gte: since } },
          _sum: { total: true },
        }),
        this.prisma.membership.groupBy({
          by: ['branchId'],
          where: { status: { in: ['active', 'grace'] } },
          _count: { _all: true },
        }),
      ]);

    const sumOf = (
      rows: { branchId: number | null; _sum: { total?: number | null; amount?: number | null } }[],
      branchId: number,
    ): number => {
      const row = rows.find((r) => r.branchId === branchId);
      return (row?._sum.total ?? row?._sum.amount ?? 0) || 0;
    };

    return branches.map((branch) => ({
      branchId: branch.id,
      branchName: branch.name,
      revenue:
        sumOf(salesByBranch, branch.id) +
        sumOf(paymentsByBranch, branch.id) +
        sumOf(pickupsByBranch, branch.id),
      activeCustomers:
        membersByBranch.find((m) => m.branchId === branch.id)?._count._all ?? 0,
    }));
  }
}
