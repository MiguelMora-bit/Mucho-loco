import { describe, expect, it } from 'vitest';
import type { Product } from '@mucho-loco/types';
import { addItem, cartCount, cartSubtotal, changeQty } from './cart';

const whey: Product = {
  id: 'whey-fresa',
  cat: 'proteinas',
  name: { es: 'Whey', en: 'Whey' },
  flav: { es: 'Fresa', en: 'Strawberry' },
  price: 1290,
  img: '/assets/prod-whey-strawberry.jpg',
};
const bcaa: Product = { ...whey, id: 'bcaa', price: 590 };

describe('addItem', () => {
  it('adds a new product with qty 1', () => {
    expect(addItem([], whey)).toEqual([{ ...whey, qty: 1 }]);
  });

  it('bumps the qty of a product already in the cart instead of duplicating it', () => {
    const items = addItem(addItem([], whey), whey);
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(2);
  });
});

describe('changeQty', () => {
  it('removes the product when it reaches 0', () => {
    expect(changeQty([{ ...whey, qty: 1 }], whey.id, -1)).toEqual([]);
  });

  it('never goes below 0', () => {
    expect(changeQty([{ ...whey, qty: 1 }], whey.id, -5)).toEqual([]);
  });

  it('leaves other products alone', () => {
    const items = changeQty([{ ...whey, qty: 1 }, { ...bcaa, qty: 2 }], bcaa.id, 1);
    expect(items).toEqual([{ ...whey, qty: 1 }, { ...bcaa, qty: 3 }]);
  });
});

describe('totals', () => {
  const items = [{ ...whey, qty: 2 }, { ...bcaa, qty: 1 }];

  it('counts units, not lines', () => {
    expect(cartCount(items)).toBe(3);
  });

  it('sums price × qty', () => {
    expect(cartSubtotal(items)).toBe(1290 * 2 + 590);
  });
});
