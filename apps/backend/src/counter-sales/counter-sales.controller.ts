import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import type { CounterSale, Lang } from '@mucho-loco/types';
import { CounterSalesService } from './counter-sales.service';
import { CreateCounterSaleDto } from './dto/create-counter-sale.dto';
import { Roles } from '../auth/roles.decorator';
import { RequestLang } from '../common/lang.decorator';

@Controller('branches/:branchId/counter-sales')
export class CounterSalesController {
  constructor(private sales: CounterSalesService) {}

  @Roles('staff')
  @Post()
  createSale(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body() dto: CreateCounterSaleDto,
    @RequestLang() lang: Lang,
  ): Promise<CounterSale> {
    return this.sales.createSale(branchId, dto, lang);
  }
}
