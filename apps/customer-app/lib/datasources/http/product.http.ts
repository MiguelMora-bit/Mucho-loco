import type { Product } from '@mucho-loco/types';
import type { IProductRepository } from '../../repositories/product.repository';
import { apiGet, apiGetOrNull } from './client';

const CATALOG_REVALIDATE = 300;

/** `GET /products` de `apps/backend` (endpoints `@Public()`, sin token). */
export class ProductHttpDatasource implements IProductRepository {
  getAll(): Promise<Product[]> {
    return apiGet<Product[]>('/products', { revalidate: CATALOG_REVALIDATE });
  }

  getById(id: string): Promise<Product | null> {
    return apiGetOrNull<Product>(`/products/${id}`, { revalidate: CATALOG_REVALIDATE });
  }

  /**
   * `'all'` NO es un `ProductCat` — es el sentinela que usan los filtros de la
   * tienda para "sin filtro". El mock lo trataba como caso especial y el
   * backend no lo conoce (`?cat=all` consultaría una categoría inexistente y
   * devolvería vacío), así que se traduce aquí a `GET /products` pelón.
   */
  getByCategory(cat: string): Promise<Product[]> {
    if (cat === 'all') return this.getAll();
    return apiGet<Product[]>('/products', { query: { cat }, revalidate: CATALOG_REVALIDATE });
  }

  /**
   * El backend deriva la categoría del propio producto, así que ignora `cat`
   * — el parámetro sigue en la firma porque es parte del contrato que ya
   * consumen `ProductClient` y sus tests.
   */
  getSiblings(id: string, _cat: string): Promise<Product[]> {
    return apiGet<Product[]>(`/products/${id}/siblings`, { revalidate: CATALOG_REVALIDATE });
  }
}
