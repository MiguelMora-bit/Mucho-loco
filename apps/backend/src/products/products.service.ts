import { Injectable, NotFoundException } from '@nestjs/common';
import type { LocalizedString, Product, ProductCat } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type { Product as ProductRow } from '@prisma/client';

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    cat: row.cat,
    name: row.name as unknown as LocalizedString,
    flav: row.flav as unknown as LocalizedString,
    price: row.price,
    img: row.img,
    tag: row.tag ?? undefined,
  };
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({ orderBy: { id: 'asc' } });
    return rows.map(toProduct);
  }

  async getById(id: string): Promise<Product> {
    const row = await this.prisma.product.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Product not found: ${id}`);
    return toProduct(row);
  }

  async getByCategory(cat: ProductCat): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({
      where: { cat },
      orderBy: { id: 'asc' },
    });
    return rows.map(toProduct);
  }

  /** Otros productos de la misma categoría, sin incluir `id` — "más de esta categoría" en la página de producto. */
  async getSiblings(id: string, cat: ProductCat): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({
      where: { cat, id: { not: id } },
      orderBy: { id: 'asc' },
    });
    return rows.map(toProduct);
  }
}
