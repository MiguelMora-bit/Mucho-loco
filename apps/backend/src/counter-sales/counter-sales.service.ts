import { Injectable, NotFoundException } from '@nestjs/common';
import type { CounterSale, Lang, PaymentMethod } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService, displayName } from '../inventory/inventory.service';
import { CreateCounterSaleDto } from './dto/create-counter-sale.dto';
import type { CounterSale as SaleRow, CounterSaleItem as SaleItemRow } from '@prisma/client';
import { productNotFound } from '../common/error-codes';
import { ChargesService } from '../charges/charges.service';

function toCounterSale(row: SaleRow & { items: SaleItemRow[] }): CounterSale {
  return {
    id: row.id,
    branchId: row.branchId,
    items: row.items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      qty: i.qty,
      unitPrice: i.unitPrice,
    })),
    total: row.total,
    paymentMethod: row.paymentMethod as PaymentMethod,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class CounterSalesService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private charges: ChargesService,
  ) {}

  /**
   * Cobra en mostrador y descuenta stock LOCAL de esa sucursal (a diferencia
   * de un pedido a domicilio, que sale de la bodega central — ver CLAUDE.md
   * raíz). Venta, descuento y cobro registrado van en la misma transacción: si
   * el stock no alcanza, no queda una venta cobrada sin producto que entregar.
   */
  async createSale(branchId: number, dto: CreateCounterSaleDto, lang: Lang): Promise<CounterSale> {
    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.picks.map((p) => p.productId) } },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    const items = dto.picks.map((pick) => {
      const product = productById.get(pick.productId);
      if (!product) throw new NotFoundException(productNotFound(pick.productId));
      return {
        productId: product.id,
        productName: displayName(product, lang),
        qty: pick.qty,
        unitPrice: product.price,
      };
    });
    const total = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);

    const sale = await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        await this.inventory.decrementForSale(
          tx, branchId, item.productId, item.qty, item.productName,
        );
      }
      const created = await tx.counterSale.create({
        data: {
          branchId,
          total,
          paymentMethod: dto.paymentMethod,
          items: { create: items },
        },
        include: { items: true },
      });
      await this.charges.recordCounterSale(tx, created);
      return created;
    });

    return toCounterSale(sale);
  }

  async getByBranchSince(branchId: number, since: Date): Promise<CounterSale[]> {
    const rows = await this.prisma.counterSale.findMany({
      where: { branchId, createdAt: { gte: since } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toCounterSale);
  }
}
