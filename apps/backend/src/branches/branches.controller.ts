import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import type { Branch } from '@mucho-loco/types';
import { BranchesService } from './branches.service';
import { Public } from '../auth/public.decorator';

/** Catálogo público — mismo dato que hoy sirve el Server Component de
 *  customer-app sin sesión (landing, mapa de sucursales). */
@Controller('branches')
export class BranchesController {
  constructor(private branches: BranchesService) {}

  @Public()
  @Get()
  getAll(): Promise<Branch[]> {
    return this.branches.getAll();
  }

  // Antes de ':id' — si no, Nest interpreta 'featured' como un :id.
  @Public()
  @Get('featured')
  getFeatured(): Promise<Branch[]> {
    return this.branches.getFeatured();
  }

  @Public()
  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number): Promise<Branch> {
    return this.branches.getById(id);
  }
}
