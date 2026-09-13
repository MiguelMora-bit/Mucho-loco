import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Order, UserProfile, Visit } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipsService } from '../memberships/memberships.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import { Prisma } from '@prisma/client';
import type {
  Branch,
  Order as OrderRow,
  OrderItem as OrderItemRow,
  User,
  Visit as VisitRow,
} from '@prisma/client';
import {
  cashRequiresPickup,
  emailAlreadyLinked,
  productNotFound,
} from '../common/error-codes';

/**
 * Quién es el socio según su ID token. Estructuralmente es un subconjunto de
 * `IdTokenClaims`, así que los controllers pasan `@CurrentUser()` tal cual.
 */
export interface CognitoIdentity {
  sub: string;
  email: string;
  name: string;
  /** `phone_number` del token, en E.164. Solo lo trae quien lo dio al registrarse (hoy, mobile-app). */
  phone?: string;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

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
  /**
   * El socio detrás de un ID token, creándolo la primera vez que se le ve.
   *
   * La identidad es `cognitoSub`, no el correo: un correo puede cambiar en
   * Cognito, el `sub` no. Pero `email` es `@unique` en la base, así que hay un
   * caso intermedio que hay que resolver a mano — un `sub` nuevo con un correo
   * que ya existe:
   *
   * - **El socio ya existía SIN cuenta de acceso** (`cognitoSub` null): lo dio
   *   de alta mostrador y ahora se instaló la app. Se le liga la cuenta y
   *   conserva su membresía, sus visitas y sus pedidos. Es un flujo real y
   *   deseable, y no hay riesgo: esa fila nunca tuvo login.
   * - **El correo ya pertenece a OTRA cuenta de acceso**: se rechaza con 409.
   *   Tomar la cuenta en silencio dejaría a alguien fuera de la suya. Pasa,
   *   por ejemplo, si se destruye y recrea el User Pool (ver "Nota operativa"
   *   en el CLAUDE.md raíz) — los socios viejos quedan con un `sub` que ya no
   *   existe y hay que limpiarlos o volver a ligarlos a mano.
   */
  async findOrCreateByCognito(identity: CognitoIdentity): Promise<User> {
    const { sub, email, name, phone } = identity;
    const existing = await this.prisma.user.findUnique({
      where: { cognitoSub: sub },
    });
    if (existing) return this.backfillPhone(existing, phone);

    const displayName = name || email.split('@')[0].toUpperCase();

    const sameEmail = email
      ? await this.prisma.user.findUnique({ where: { email } })
      : null;
    if (sameEmail) {
      // Ligado a ESTE mismo sub: lo creó una request paralela del mismo socio
      // entre las dos búsquedas de arriba (no existía por `cognitoSub`, y para
      // cuando se buscó por correo ya sí). Es él, no otra cuenta.
      if (sameEmail.cognitoSub === sub) {
        return this.backfillPhone(sameEmail, phone);
      }
      if (sameEmail.cognitoSub !== null) {
        throw new ConflictException(emailAlreadyLinked(email));
      }
      return this.prisma.user.update({
        where: { id: sameEmail.id },
        data: {
          cognitoSub: sub,
          name: sameEmail.name || displayName,
          // El teléfono que dio en mostrador gana: es el que ya se verificó en persona.
          ...(phone && !sameEmail.phone ? { phone } : {}),
        },
      });
    }

    // Socio y membresía en UNA transacción, y el choque de índice único
    // tratado como "ya lo creó otro". El panel del móvil pide perfil,
    // membresía, visitas y pedidos a la vez: con un socio nuevo, las cuatro
    // requests llegan aquí antes de que exista. Gana un insert; los demás
    // esperan a que ese commit termine, chocan con el índice de `cognitoSub`
    // y leen al ganador — ya con su membresía, porque nacieron juntos. Sin la
    // transacción, un perdedor podía encontrar al socio pero no su membresía.
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          // `email || null` y no `email`: un token sin correo guardaría la cadena
          // vacía, y como la columna es UNIQUE el segundo caso así reventaría.
          // "Sin correo" es null, que Postgres sí permite repetir.
          data: {
            cognitoSub: sub,
            email: email || null,
            name: displayName,
            phone: phone ?? '',
          },
        });
        await this.memberships.createDefaultForUser(user.id, tx);
        return user;
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return this.prisma.user.findUniqueOrThrow({
          where: { cognitoSub: sub },
        });
      }
      throw err;
    }
  }

  /**
   * Un socio que se registró antes de que se pidiera teléfono (la web todavía
   * no lo pide) lo gana la primera vez que entra con un token que sí lo trae.
   * Nunca se sobrescribe uno que ya tenía.
   */
  private async backfillPhone(
    user: User,
    phone: string | undefined,
  ): Promise<User> {
    if (!phone || user.phone) return user;
    return this.prisma.user.update({ where: { id: user.id }, data: { phone } });
  }

  async getProfile(identity: CognitoIdentity): Promise<UserProfile> {
    const user = await this.findOrCreateByCognito(identity);
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
