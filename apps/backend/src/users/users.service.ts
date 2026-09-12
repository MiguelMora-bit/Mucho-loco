import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Order, UserProfile, Visit } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipsService } from '../memberships/memberships.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import type {
  Branch,
  Order as OrderRow,
  OrderItem as OrderItemRow,
  User,
  Visit as VisitRow,
} from '@prisma/client';
import { cashRequiresPickup, productNotFound } from '../common/error-codes';

// Mismo cargo fijo que hoy vive hardcodeado en CheckoutClient.tsx del
// frontend — duplicado a propósito (sin runtime compartido entre back/front
// todavía, ver CLAUDE.md raíz sobre esa misma decisión entre apps).
const HOME_SHIPPING_FEE = 99;

function toVisit(row: VisitRow & { branch: Branch }): Visit {
  return {
    visitedAt: row.visitedAt.toISOString(),
    branch: row.branch.name,
    durationMinutes: row.durationMinutes,
  };
}

function toOrder(
  row: OrderRow & { items: OrderItemRow[]; branch: Branch | null },
): Order {
  return {
    id: row.id,
    date: row.createdAt.toISOString(),
    status: row.status,
    items: row.items.map((i) => ({
      name: i.name,
      flav: i.flav,
      img: i.img,
      qty: i.qty,
    })),
    total: row.total,
    paymentMethod: row.paymentMethod,
    delivery: row.delivery,
    branch: row.branch?.name,
    deliveredAt: row.deliveredAt?.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private memberships: MembershipsService,
  ) {}

  /** Primera vez que se ve este sub de Cognito: crea el perfil + membresía
   *  default (tier 'all', Roma Sur, activa 30 días) — mismo comportamiento
   *  que fallbackRecord() en user.mock.ts para una cuenta real sin dato
   *  curado. Cognito ya garantiza que el sub es válido (pasó CognitoAuthGuard). */
  async findOrCreateByCognito(
    sub: string,
    email: string,
    name: string,
  ): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { cognitoSub: sub },
    });
    if (existing) return existing;

    const user = await this.prisma.user.create({
      data: {
        cognitoSub: sub,
        email,
        name: name || email.split('@')[0].toUpperCase(),
      },
    });
    await this.memberships.createDefaultForUser(user.id);
    return user;
  }

  async getProfile(
    sub: string,
    email: string,
    name: string,
  ): Promise<UserProfile> {
    const user = await this.findOrCreateByCognito(sub, email, name);
    const membership = await this.prisma.membership.findUniqueOrThrow({
      where: { userId: user.id },
      include: { branch: true },
    });
    return {
      email: user.email ?? '',
      name: user.name,
      phone: user.phone,
      birthdate: user.birthdate,
      branch: membership.branch.name,
    };
  }

  async getVisitHistory(userId: string): Promise<Visit[]> {
    const rows = await this.prisma.visit.findMany({
      where: { userId },
      include: { branch: true },
      orderBy: { visitedAt: 'desc' },
    });
    return rows.map(toVisit);
  }

  async getOrders(userId: string): Promise<Order[]> {
    const rows = await this.prisma.order.findMany({
      where: { userId },
      include: { items: true, branch: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toOrder);
  }

  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    if (dto.paymentMethod === 'cash' && dto.delivery !== 'pickup') {
      // Efectivo online solo aplica cuando la entrega es "recoger en gym" — ver CLAUDE.md raíz.
      throw new BadRequestException(cashRequiresPickup());
    }

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    const items = dto.items.map((line) => {
      const product = productById.get(line.productId);
      if (!product)
        throw new NotFoundException(productNotFound(line.productId));
      const name = (product.name as Record<string, string>)[dto.lang];
      const flav = (product.flav as Record<string, string>)[dto.lang];
      return {
        name,
        flav,
        img: product.img,
        qty: line.qty,
        unitPrice: product.price,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
    const shipping = dto.delivery === 'home' ? HOME_SHIPPING_FEE : 0;

    let branchId: number | null = null;
    if (dto.delivery === 'pickup') {
      const membership = await this.prisma.membership.findUniqueOrThrow({
        where: { userId },
      });
      branchId = membership.branchId;
    }

    // Efectivo solo aplica con pickup (ya validado arriba) — el pedido queda
    // pendiente de pago hasta que se cobra en mostrador, no "listo" como si
    // ya estuviera pagado (ver CLAUDE.md raíz, "Pagos en línea").
    const status = dto.paymentMethod === 'cash' ? 'pending_payment' : 'ready';

    const order = await this.prisma.order.create({
      data: {
        userId,
        status,
        total: subtotal + shipping,
        paymentMethod: dto.paymentMethod,
        delivery: dto.delivery,
        branchId,
        items: {
          create: items.map(({ name, flav, img, qty }) => ({
            name,
            flav,
            img,
            qty,
          })),
        },
      },
      include: { items: true, branch: true },
    });
    return toOrder(order);
  }
}
