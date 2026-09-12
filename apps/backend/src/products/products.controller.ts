import { Controller, Get, Param, Query } from '@nestjs/common';
import type { Product, ProductCat } from '@mucho-loco/types';
import { ProductsService } from './products.service';
import { Public } from '../auth/public.decorator';

@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Public()
  @Get()
  getAll(@Query('cat') cat?: ProductCat): Promise<Product[]> {
    return cat ? this.products.getByCategory(cat) : this.products.getAll();
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string): Promise<Product> {
    return this.products.getById(id);
  }

  // El cat de los siblings se deriva del producto (getById), no hace falta
  // que el cliente lo mande — a diferencia del repository mock, que sí lo
  // recibía porque el caller ya tenía el producto cargado en memoria.
  @Public()
  @Get(':id/siblings')
  async getSiblings(@Param('id') id: string): Promise<Product[]> {
    const product = await this.products.getById(id);
    return this.products.getSiblings(id, product.cat);
  }
}
