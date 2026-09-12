import { Injectable, NotFoundException } from '@nestjs/common';
import type { Branch, BranchPromo } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type { Branch as BranchRow } from '@prisma/client';

/** promo llega de la columna Json (nullable) — el contrato de @mucho-loco/types
 *  usa `promo?: BranchPromo` (undefined, no null) para que el frontend pueda
 *  seguir escribiendo `branch.promo &&` sin distinguir null de undefined. */
function toBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    addr: row.addr,
    phone: row.phone,
    lat: row.lat,
    lng: row.lng,
    classes: row.classes,
    coaches: row.coaches,
    price: row.price,
    tier: row.tier,
    featured: row.featured,
    promo: (row.promo as BranchPromo | null) ?? undefined,
    hours: row.hours,
    img: row.img,
  };
}

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Branch[]> {
    const rows = await this.prisma.branch.findMany({ orderBy: { id: 'asc' } });
    return rows.map(toBranch);
  }

  async getFeatured(): Promise<Branch[]> {
    const rows = await this.prisma.branch.findMany({
      where: { featured: true },
      orderBy: { id: 'asc' },
    });
    return rows.map(toBranch);
  }

  async getById(id: number): Promise<Branch> {
    const row = await this.prisma.branch.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Branch not found: ${id}`);
    return toBranch(row);
  }
}
