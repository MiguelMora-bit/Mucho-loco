import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import type {
  BranchInventoryLevel,
  GlobalInventoryItem,
  InventoryTransfer,
  Lang,
} from '@mucho-loco/types';
import { InventoryService } from './inventory.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Roles } from '../auth/roles.decorator';
import { RequestLang } from '../common/lang.decorator';

/**
 * Inventario físico por sucursal.
 *
 * Dos audiencias con permisos distintos: mostrador ve y vende el stock de SU
 * sucursal (`staff`), y HQ ve el consolidado y mueve stock entre sucursales
 * (`owner`). Por eso las rutas de cadena completa piden rol owner y las de una
 * sucursal no.
 */
@Controller()
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Roles('staff')
  @Get('branches/:branchId/inventory')
  getBranchLevels(
    @Param('branchId', ParseIntPipe) branchId: number,
    @RequestLang() lang: Lang,
  ): Promise<BranchInventoryLevel[]> {
    return this.inventory.getLevels(lang, branchId);
  }

  @Roles('owner')
  @Get('inventory')
  getAllLevels(@RequestLang() lang: Lang): Promise<BranchInventoryLevel[]> {
    return this.inventory.getLevels(lang);
  }

  @Roles('owner')
  @Get('inventory/global')
  getGlobal(@RequestLang() lang: Lang): Promise<GlobalInventoryItem[]> {
    return this.inventory.getGlobal(lang);
  }

  @Roles('owner')
  @Get('inventory/transfers')
  getTransfers(): Promise<InventoryTransfer[]> {
    return this.inventory.getTransfers();
  }

  @Roles('owner')
  @Post('inventory/transfers')
  createTransfer(@Body() dto: CreateTransferDto): Promise<InventoryTransfer> {
    return this.inventory.createTransfer(dto);
  }
}
