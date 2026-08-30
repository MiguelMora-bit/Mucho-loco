import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, CartItem } from '@mucho-loco/types';

interface CartState {
  items: CartItem[];
  _hydrated: boolean;
}

interface CartActions {
  addItem: (product: Product) => void;
  updateQty: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  setHydrated: (v: boolean) => void;
}

export type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      _hydrated: false,
      setHydrated: (v) => set({ _hydrated: v }),
      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === product.id ? { ...i, qty: i.qty + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...product, qty: 1 }] };
        }),
      updateQty: (id, delta) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
            .filter((i) => i.qty > 0),
        })),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'ml-cart',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

// Selectors — use these in components to avoid hydration mismatches
export const selectCartCount = (s: CartStore): number =>
  s._hydrated ? s.items.reduce((n, i) => n + i.qty, 0) : 0;

export const selectSubtotal = (s: CartStore): number =>
  s.items.reduce((n, i) => n + i.price * i.qty, 0);
