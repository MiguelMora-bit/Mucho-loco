import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import type { ShipmentOrder } from '@mucho-loco/types';
import { ShipmentsService } from './shipments.service';
import { Roles } from '../auth/roles.decorator';

export class ShipOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  trackingNumber?: string;
}

/**
 * Envíos a domicilio desde la bodega central. Solo dueño: hoy la bodega la
 * opera HQ (no existe un rol de bodega), y ve la dirección y el teléfono de
 * cualquier socio de la cadena.
 */
@Controller('shipments')
export class ShipmentsController {
  constructor(private shipments: ShipmentsService) {}

  @Roles('owner')
  @Get()
  getAll(): Promise<ShipmentOrder[]> {
    return this.shipments.getAll();
  }

  @Roles('owner')
  @Post(':orderId/ship')
  @HttpCode(200)
  markShipped(@Param('orderId') orderId: string, @Body() dto: ShipOrderDto): Promise<ShipmentOrder> {
    return this.shipments.markShipped(orderId, dto.trackingNumber);
  }

  @Roles('owner')
  @Post(':orderId/deliver')
  @HttpCode(200)
  markDelivered(@Param('orderId') orderId: string): Promise<ShipmentOrder> {
    return this.shipments.markDelivered(orderId);
  }
}
