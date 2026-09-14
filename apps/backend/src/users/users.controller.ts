import { Body, Controller, Get, Post } from '@nestjs/common';
import type {
  MembershipInfo,
  Order,
  UserProfile,
  Visit,
} from '@mucho-loco/types';
import { UsersService } from './users.service';
import { MembershipsService } from '../memberships/memberships.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { IdTokenClaims } from '../auth/cognito';
import { CreateOrderDto } from './dto/create-order.dto';

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
