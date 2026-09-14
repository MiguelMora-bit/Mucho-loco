import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartItem, Product } from '@mucho-loco/types';
import { addItem, changeQty } from '../cart';

interface CartState {
  items: CartItem[];
  add: (product: Product) => void;
  changeQty: (id: string, delta: number) => void;
  clear: () => void;
}

/**
 * Mismo carrito que `cart.store.ts` de customer-app, con AsyncStorage en vez
 * de localStorage. Sin el `_hydrated` de la web: ese existía para que el HTML
 * del servidor y el del navegador coincidieran, y aquí no hay render de
 * servidor.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (product) => set((s) => ({ items: addItem(s.items, product) })),
      changeQty: (id, delta) => set((s) => ({ items: changeQty(s.items, id, delta) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'ml-cart', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
