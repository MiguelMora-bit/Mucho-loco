import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import type {
  MembershipInfo,
  NotificationPreferences,
  Order,
  UserProfile,
  Visit,
} from '@mucho-loco/types';
import { UsersService } from './users.service';
import { MembershipsService } from '../memberships/memberships.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { IdTokenClaims } from '../auth/cognito';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { NotificationPreferencesDto } from './dto/notification-preferences.dto';

/** Todo detrás de CognitoAuthGuard (default global, ver main.ts) — "me"
 *  siempre es quien mandó el ID token, nunca un email que el cliente pueda
 *  elegir (a diferencia del mock, donde email era un parámetro cualquiera). */
@Controller('users/me')
export class UsersController {
  constructor(
    private users: UsersService,
    private memberships: MembershipsService,
  ) {}

  @Get()
  getProfile(@CurrentUser() user: IdTokenClaims): Promise<UserProfile> {
    return this.users.getProfile(user);
  }

  /**
   * Completar o cambiar el teléfono (spec 015) — sin él no hay avisos de
   * WhatsApp, y quien entra con Google/Facebook nunca lo dio.
   */
  @Put('phone')
  updatePhone(
    @CurrentUser() user: IdTokenClaims,
    @Body() dto: UpdatePhoneDto,
  ): Promise<UserProfile> {
    return this.users.updatePhone(user, dto.phone);
  }

  /** Qué avisos de WhatsApp quiere el socio (spec 053). */
  @Get('notification-preferences')
  getNotificationPreferences(@CurrentUser() user: IdTokenClaims): Promise<NotificationPreferences> {
    return this.users.getNotificationPreferences(user);
  }

  @Put('notification-preferences')
  updateNotificationPreferences(
    @CurrentUser() user: IdTokenClaims,
    @Body() dto: NotificationPreferencesDto,
  ): Promise<NotificationPreferences> {
    return this.users.updateNotificationPreferences(user, {
      membership: dto.membership,
      orders: dto.orders,
      payments: dto.payments,
    });
  }

  @Get('membership')
  async getMembership(
    @CurrentUser() user: IdTokenClaims,
  ): Promise<MembershipInfo> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.memberships.getForUser(dbUser.id);
  }

  @Get('visits')
  async getVisitHistory(@CurrentUser() user: IdTokenClaims): Promise<Visit[]> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.users.getVisitHistory(dbUser.id);
  }

  @Get('orders')
  async getOrders(@CurrentUser() user: IdTokenClaims): Promise<Order[]> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.users.getOrders(dbUser.id);
  }

  @Post('orders')
  async createOrder(
    @CurrentUser() user: IdTokenClaims,
    @Body() dto: CreateOrderDto,
  ): Promise<Order> {
    const dbUser = await this.users.findOrCreateByCognito(user);
    return this.users.createOrder(dbUser.id, dto);
  }
}
