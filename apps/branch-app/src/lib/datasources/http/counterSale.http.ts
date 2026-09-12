import type { BranchInventoryLevel, CounterSale, PaymentMethod } from '@mucho-loco/types';
import type { ICounterSaleRepository } from '../../repositories/counterSale.repository';
import { InsufficientStockError, ProductNotFoundError } from '../../repositories/counterSale.errors';
import { ApiRequestError, apiGet, apiPost } from './client';

/**
 * Traduce el error del API al error TIPADO que el contrato promete.
 *
 * Es la razón de que el backend mande `{ code }` y no solo un mensaje: la UI
 * distingue "no existe el producto" de "no alcanza el stock" sin leer prosa en
 * español (ver el comentario en counterSale.errors.ts). Cualquier otro fallo
 * se deja pasar tal cual — un 500 o una red caída no son errores de negocio y
 * no deben disfrazarse de uno.
 */
function toDomainError(e: unknown): unknown {
  if (!(e instanceof ApiRequestError)) return e;
  switch (e.code) {
    case 'INSUFFICIENT_STOCK':
      return new InsufficientStockError(String(e.body.productName ?? e.body.productId ?? ''));
    case 'PRODUCT_NOT_FOUND':
    case 'BRANCH_DOES_NOT_STOCK_PRODUCT':
      // Para mostrador son lo mismo: el producto no se puede vender aquí. Que
      // el catálogo no lo tenga o que esta sucursal no lo maneje es una
      // distinción del backend, no de quien está cobrando.
      return new ProductNotFoundError(String(e.body.productId ?? ''));
    default:
      return e;
  }
}

export class CounterSaleHttpDatasource implements ICounterSaleRepository {
  /** `?lang=` lo agrega el cliente: el backend arma "Whey Protein 5LBS · Fresa" según idioma. */
  getInventory(branchId: number): Promise<BranchInventoryLevel[]> {
    return apiGet<BranchInventoryLevel[]>(`/branches/${branchId}/inventory`, {}, true);
  }

  async createSale(
    branchId: number,
    picks: Array<{ productId: string; qty: number }>,
    paymentMethod: PaymentMethod,
  ): Promise<CounterSale> {
    try {
      return await apiPost<CounterSale>(
        `/branches/${branchId}/counter-sales`,
        { picks, paymentMethod },
        {},
        true,
      );
    } catch (e) {
      throw toDomainError(e);
    }
  }
}
