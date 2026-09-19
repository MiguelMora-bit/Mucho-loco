import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BranchInventoryLevel,
  GlobalInventoryItem,
  InventoryTransfer,
  Lang,
  LocalizedString,
} from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma, Product as ProductRow } from '@prisma/client';
import { CreateTransferDto } from './dto/create-transfer.dto';
import {
  branchDoesNotStockProduct,
  insufficientStock,
  sameBranchTransfer,
} from '../common/error-codes';

/**
 * Nombre de producto para pantallas de inventario/venta: "Whey Protein 5LBS ·
 * Strawberry". Los mocks lo tenían escrito a mano y de forma inconsistente (a
 * unos productos les ponían el sabor y a otros no); aquí se arma siempre igual
 * a partir del catálogo, así un cambio de nombre no deja copias viejas
 * regadas en 15 sucursales.
 */
export function displayName(product: ProductRow, lang: Lang): string {
  const name = (product.name as unknown as LocalizedString)[lang];
  const flav = (product.flav as unknown as LocalizedString)[lang];
  return flav ? `${name} · ${flav}` : name;
}

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  /** Niveles de una sucursal (venta de mostrador) o de todas (panel del dueño). */
  async getLevels(lang: Lang, branchId?: number): Promise<BranchInventoryLevel[]> {
    const rows = await this.prisma.branchInventory.findMany({
      where: branchId === undefined ? {} : { branchId },
      include: { product: true },
      orderBy: [{ branchId: 'asc' }, { productId: 'asc' }],
    });
    return rows.map((row) => ({
      branchId: row.branchId,
      productId: row.productId,
      productName: displayName(row.product, lang),
      unitPrice: row.product.price,
      qty: row.qty,
      img: row.product.img,
    }));
  }

  /** Inventario consolidado de la cadena — una fila por producto, sumando las 15 sucursales. */
  async getGlobal(lang: Lang): Promise<GlobalInventoryItem[]> {
    const rows = await this.prisma.branchInventory.findMany({
      include: { product: true },
    });
    const byProduct = new Map<string, GlobalInventoryItem>();
    for (const row of rows) {
      const existing = byProduct.get(row.productId);
      if (existing) {
        existing.totalQty += row.qty;
      } else {
        byProduct.set(row.productId, {
          productId: row.productId,
          productName: displayName(row.product, lang),
          totalQty: row.qty,
        });
      }
    }
    return [...byProduct.values()].sort((a, b) => a.productId.localeCompare(b.productId));
  }

  async getTransfers(): Promise<InventoryTransfer[]> {
    const rows = await this.prisma.inventoryTransfer.findMany({
      include: { product: true, fromBranch: true, toBranch: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      // Sin sabor: el mock de owner-panel listaba "Shaker Loco" a secas en la
      // tabla de transferencias, y ahí el sabor no aporta (se mueve el SKU).
      productName: (row.product.name as unknown as LocalizedString).es,
      fromBranchId: row.fromBranchId,
      fromBranchName: row.fromBranch.name,
      toBranchId: row.toBranchId,
      toBranchName: row.toBranch.name,
      qty: row.qty,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  /**
   * Mueve stock entre sucursales. Descontar del origen, sumar al destino y
   * registrar el movimiento van en UNA transacción de base de datos: si algo
   * falla a medias, no puede quedar stock evaporado.
   *
   * El destino puede no tener todavía una fila para ese producto (una sucursal
   * no lista todo el catálogo) — `upsert` la abre en ese caso, mismo
   * comportamiento que ya tenía el mock.
   */
  async createTransfer(dto: CreateTransferDto): Promise<InventoryTransfer> {
    if (dto.fromBranchId === dto.toBranchId) {
      throw new BadRequestException(sameBranchTransfer());
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const source = await tx.branchInventory.findUnique({
        where: { branchId_productId: { branchId: dto.fromBranchId, productId: dto.productId } },
      });
      if (!source) {
        throw new NotFoundException(
          branchDoesNotStockProduct(dto.fromBranchId, dto.productId),
        );
      }
      if (source.qty < dto.qty) {
        throw new BadRequestException(
          insufficientStock(dto.productId, dto.productId, source.qty, dto.qty),
        );
      }

      await tx.branchInventory.update({
        where: { branchId_productId: { branchId: dto.fromBranchId, productId: dto.productId } },
        data: { qty: { decrement: dto.qty } },
      });
      await tx.branchInventory.upsert({
        where: { branchId_productId: { branchId: dto.toBranchId, productId: dto.productId } },
        create: { branchId: dto.toBranchId, productId: dto.productId, qty: dto.qty },
        update: { qty: { increment: dto.qty } },
      });

      return tx.inventoryTransfer.create({
        data: {
          productId: dto.productId,
          fromBranchId: dto.fromBranchId,
          toBranchId: dto.toBranchId,
          qty: dto.qty,
        },
        include: { product: true, fromBranch: true, toBranch: true },
      });
    });

    return {
      id: created.id,
      productId: created.productId,
      productName: (created.product.name as unknown as LocalizedString).es,
      fromBranchId: created.fromBranchId,
      fromBranchName: created.fromBranch.name,
      toBranchId: created.toBranchId,
      toBranchName: created.toBranch.name,
      qty: created.qty,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Descuenta stock local por una venta de mostrador. Vive aquí y no en
   * CounterSalesService porque el invariante "el stock nunca queda negativo"
   * es de este dominio — quien venda (mostrador hoy, otra cosa mañana) lo
   * reusa en vez de reimplementarlo.
   *
   * Recibe `tx` porque el caller ya está dentro de una transacción: la venta y
   * el descuento tienen que ser atómicos.
   */
  async decrementForSale(
    tx: Prisma.TransactionClient,
    branchId: number,
    productId: string,
    qty: number,
    /** Para el mensaje de error: la UI muestra "no hay suficiente Whey", no "de p1". */
    productName?: string,
  ): Promise<void> {
    const level = await tx.branchInventory.findUnique({
      where: { branchId_productId: { branchId, productId } },
    });
    if (!level) {
      throw new NotFoundException(branchDoesNotStockProduct(branchId, productId));
    }
    if (level.qty < qty) {
      throw new BadRequestException(
        insufficientStock(productId, productName ?? productId, level.qty, qty),
      );
    }
    await tx.branchInventory.update({
      where: { branchId_productId: { branchId, productId } },
      data: { qty: { decrement: qty } },
    });
  }
}
