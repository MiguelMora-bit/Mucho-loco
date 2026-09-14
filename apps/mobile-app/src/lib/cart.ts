import type { CartItem, Product } from '@mucho-loco/types';

// Funciones puras del carrito: el store de Zustand solo las llama. Separadas
// para poder testearlas sin React Native (vitest corre en Node).

export function addItem(items: CartItem[], product: Product): CartItem[] {
  const existing = items.find((i) => i.id === product.id);
  if (existing) {
    return items.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
  }
  return [...items, { ...product, qty: 1 }];
}

/** Suma `delta` a la cantidad; en 0 el producto sale del carrito. */
export function changeQty(items: CartItem[], id: string, delta: number): CartItem[] {
  return items
    .map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
    .filter((i) => i.qty > 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.qty, 0);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.price * i.qty, 0);
}
